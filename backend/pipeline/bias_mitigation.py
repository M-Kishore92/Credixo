# backend/pipeline/bias_mitigation.py
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from fairlearn.reductions import ExponentiatedGradient, DemographicParity, EqualizedOdds
from fairlearn.postprocessing import ThresholdOptimizer

def apply_stratified_smote(X, y, feature_names, sensitive_cols, random_state=42):
    """
    Applies SMOTE strictly for target class balance (repaid/defaulted),
    stratified within each protected group (e.g. gender, area_type).
    Sensitive/quasi-sensitive columns are excluded from the interpolation feature space,
    and original demographic labels are re-attached after oversampling.
    """
    if not isinstance(X, pd.DataFrame):
        df_X = pd.DataFrame(X, columns=feature_names).reset_index(drop=True)
    else:
        df_X = X.copy().reset_index(drop=True)
        
    y_arr = np.array(y)
    y_series = pd.Series(y_arr, index=df_X.index, name="target")
    
    # Identify non-sensitive numerical & non-demographic columns for interpolation
    sens_set = set(sensitive_cols)
    interpolation_cols = [c for c in feature_names if c not in sens_set]
    
    # Stratification key across sensitive attributes
    strata = df_X[sensitive_cols].astype(str).agg('_'.join, axis=1)
    
    resampled_X_list = []
    resampled_y_list = []
    
    for stratum_val, group_idx in strata.groupby(strata).groups.items():
        sub_X_interp = df_X.loc[group_idx, interpolation_cols]
        sub_X_sens = df_X.loc[group_idx, sensitive_cols]
        sub_y = y_series.loc[group_idx]
        
        class_counts = sub_y.value_counts()
        
        # Check if SMOTE is feasible within this stratum (requires both classes and sufficient samples)
        if len(class_counts) > 1 and class_counts.min() >= 2:
            k_neighbors = min(class_counts.min() - 1, 5)
            k_neighbors = max(1, k_neighbors)
            smote = SMOTE(k_neighbors=k_neighbors, random_state=random_state)
            
            try:
                sub_X_res_interp, sub_y_res = smote.fit_resample(sub_X_interp, sub_y)
                
                # Re-attach the exact demographic values of this stratum to all samples
                n_resampled = len(sub_y_res)
                rep_sens_row = sub_X_sens.iloc[0].to_dict()
                sub_X_res_sens = pd.DataFrame([rep_sens_row] * n_resampled, columns=sensitive_cols)
                
                # Combine interpolated non-sensitive features + intact sensitive features in original column order
                combined_res = pd.concat([
                    sub_X_res_interp.reset_index(drop=True),
                    sub_X_res_sens.reset_index(drop=True)
                ], axis=1)[feature_names]
                
                resampled_X_list.append(combined_res)
                resampled_y_list.append(sub_y_res)
                continue
            except Exception as e:
                # If SMOTE fails on a very sparse subgroup, keep original samples
                pass
                
        # If single class or too few samples, retain original subgroup data intact
        resampled_X_list.append(df_X.loc[group_idx, feature_names])
        resampled_y_list.append(sub_y)
        
    X_final = pd.concat(resampled_X_list, ignore_index=True)
    y_final = pd.concat(resampled_y_list, ignore_index=True)
    
    if isinstance(X, np.ndarray):
        return X_final.values, y_final.values
    return X_final, y_final

def compute_kamiran_calders_weights(X, y, feature_names, sensitive_cols):
    """
    Computes sample weights using the Kamiran & Calders (2012) reweighing algorithm
    for demographic parity:
      W(S=s, Y=y) = (P(S=s) * P(Y=y)) / P(S=s, Y=y) = (|S| * |Y|) / (N * |S ∩ Y|)
    Eliminates statistical dependence between sensitive attributes and loan repayment labels.
    """
    if not isinstance(X, pd.DataFrame):
        df_X = pd.DataFrame(X, columns=feature_names)
    else:
        df_X = X.copy()
        
    y_arr = np.array(y)
    n_total = len(y_arr)
    
    if n_total == 0:
        return np.ones(0)
        
    # Build combined sensitive group identifier
    strata = df_X[sensitive_cols].astype(str).agg('_'.join, axis=1)
    
    weights = np.ones(n_total, dtype=float)
    
    for s_val in strata.unique():
        s_mask = (strata == s_val).values
        n_s = np.sum(s_mask)
        
        for y_val in np.unique(y_arr):
            y_mask = (y_arr == y_val)
            n_y = np.sum(y_mask)
            
            s_and_y_mask = s_mask & y_mask
            n_s_y = np.sum(s_and_y_mask)
            
            if n_s_y > 0 and n_total > 0:
                expected_prob = (n_s / n_total) * (n_y / n_total)
                observed_prob = n_s_y / n_total
                w = expected_prob / observed_prob
                weights[s_and_y_mask] = w
            elif n_s_y == 0 and n_s > 0:
                weights[s_and_y_mask] = 1.0
                
    # Normalize weights so sum equals N
    if np.sum(weights) > 0:
        weights = weights * (n_total / np.sum(weights))
        
    return weights

def train_fair_model_threshold_optimizer(base_estimator, X_train, y_train, sensitive_features, constraints="demographic_parity"):
    """
    Wraps and post-processes a trained estimator using Fairlearn's ThresholdOptimizer
    to enforce demographic parity or equalized odds across protected groups.
    """
    optimizer = ThresholdOptimizer(
        estimator=base_estimator,
        constraints=constraints,
        predict_method="predict_proba",
        prefit=True
    )
    optimizer.fit(X_train, y_train, sensitive_features=sensitive_features)
    return optimizer
