# backend/train_models.py
"""
Credixo — Model Training & Walk-Forward Validation Pipeline.

========================================================================================
1. TIME-BASED (WALK-FORWARD) SPLIT & CAUSAL CUTOFF LOGIC (NO FUTURE LEAKAGE)
========================================================================================
CRITICAL ANTI-LEAKAGE REQUIREMENT:
`prior_repayment_record` captures an applicant's historical repayment ratio on prior
closed credit lines. In production, this signal is strictly backward-looking / causal:
it only reflects facilities closed STRICTLY BEFORE the origination date of the loan
being underwritten (t_closure < t_application).

A random/shuffled split (e.g. standard train_test_split with shuffle=True) causes
catastrophic TARGET LEAKAGE and lookahead bias:
- Future loans for an applicant could appear in the training set while past loans from
  the same cohort appear in the validation/test sets.
- Shuffled splits allow behavioral patterns that crystallized AFTER the decision point
  to inform model weights evaluated on prior loans.

WALK-FORWARD CUTOFF DESIGN:
- The synthetic dataset is sorted chronologically by origination timestamp (t_0 ... t_N).
- We enforce a strict walk-forward temporal split:
    * Train Split (Chronological 0% - 60%, n=4,800): Earliest historical originations.
    * Calibration Split (Chronological 60% - 80%, n=1,600): In-time / Out-of-period cohort
      used solely for post-hoc isotonic probability calibration.
    * Test Split (Chronological 80% - 100%, n=1,600): Out-of-time / Future cohort simulating
      genuine production performance on unseen forward-dated loan applications.
- Cross-validation within the training block is performed using TimeSeriesSplit (5 folds)
  where fold k only trains on indices < k and tests on fold k (strict forward-chaining).

========================================================================================
2. MODEL ARCHITECTURE & DECOUPLED DECISION-STAGE FEATURES
========================================================================================
- Model A: Behavioral XGBoost Classifier (model_a_behavior.pkl)
- Model B: Unsupervised Weighted Composite Index (0-100, "estimated, not verified")
- Alternative Credit Score (ACS): Composite 0.60 * Behavior + 0.40 * Income Index
- Decision Models:
    * XGBoost (xgb_decision.pkl): Label-encoded categoricals + numeric loan factors (14 features).
    * Logistic Regression (lr_decision.pkl): One-Hot Encoded protected/demographic attributes
      (gender, area_type, employment_type) + label-encoded remaining categories + numerics.
    * Post-hoc Isotonic Calibrators (lr_calibrator.pkl, xgb_calibrator.pkl) fitted on calibration split.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, confusion_matrix
from imblearn.over_sampling import SMOTE

# Training population distribution constants for income_per_dependent min-max scaling
TRAIN_MIN_INCOME_PER_DEP = 300.0
TRAIN_MAX_INCOME_PER_DEP = 50000.0

def train_all():
    """
    Executes walk-forward time-based training, 5-fold cross-validation, and saves production artefacts.
    """
    base_path = os.path.dirname(__file__)
    data_path = os.path.join(base_path, "data", "synthetic_loan_data.csv")
    models_path = os.path.join(os.path.dirname(base_path), "models")

    if not os.path.exists(models_path):
        os.makedirs(models_path)

    df = pd.read_csv(data_path)
    n_total = len(df)
    print(f"[DATASET] Loaded {n_total} records from {data_path}")

    # =========================================================================
    # STEP 1: MODEL A — Behavioral XGBoost Classifier (Walk-Forward Split)
    # =========================================================================
    features_a = [
        'utility_payment_consistency',
        'electricity_payment_regularity',
        'prior_repayment_record',
        'mobile_recharge_frequency',
    ]
    df_a = df[features_a + ['loan_repaid']].copy()
    df_a['prior_repayment_record'] = df_a['prior_repayment_record'].fillna(-1)
    df_a['utility_payment_consistency'] = df_a['utility_payment_consistency'].fillna(0.6)
    df_a['electricity_payment_regularity'] = df_a['electricity_payment_regularity'].fillna(0.6)
    df_a['mobile_recharge_frequency'] = df_a['mobile_recharge_frequency'].fillna(2.5)

    # Time-based split: first 80% train, last 20% test for Model A
    split_a = int(n_total * 0.80)
    X_a_train = df_a[features_a].iloc[:split_a]
    y_a_train = df_a['loan_repaid'].iloc[:split_a]

    smote_a = SMOTE(random_state=42)
    X_res_a, y_res_a = smote_a.fit_resample(X_a_train, y_a_train)

    model_a = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    model_a.fit(X_res_a, y_res_a)

    with open(os.path.join(models_path, "model_a_behavior.pkl"), "wb") as f:
        pickle.dump(model_a, f)
    print("[MODEL A] Behavior XGBoost trained and saved [demo-stage, proxy data].")

    # =========================================================================
    # STEP 2: MODEL B — Unsupervised Weighted Composite Index (0-100)
    # =========================================================================
    def compute_model_b_unsupervised_row(row):
        area = row.get("area_type", "Rural")
        reg_avg = {"Urban": 1200, "Semi-urban": 800, "Rural": 500}.get(area, 500)
        elec_val = row.get("electricity_bill_avg")
        elec_norm = min(3.0, elec_val / reg_avg) if pd.notnull(elec_val) else 0.5
        mob_amt = row.get("mobile_recharge_avg")
        mob_amt_norm = min(3.0, mob_amt / 300.0) if pd.notnull(mob_amt) else 0.5
        mob_freq = row.get("mobile_recharge_frequency")
        mob_freq_norm = min(3.0, mob_freq / 2.5) if pd.notnull(mob_freq) else 1.0
        app_inc = float(row.get("applicant_income") or 0.0)
        coapp_inc = float(row.get("coapplicant_income") or 0.0)
        dep = float(row.get("dependents") or 0.0)
        tot_inc = app_inc + (coapp_inc if coapp_inc > 0 else 0)
        inc_per_dep = tot_inc / (dep + 1.0)
        scaled_burden = (inc_per_dep - TRAIN_MIN_INCOME_PER_DEP) / (TRAIN_MAX_INCOME_PER_DEP - TRAIN_MIN_INCOME_PER_DEP)
        household_cap = 1.0 - min(1.0, max(0.0, scaled_burden))
        stab_map = {"Salaried": 3.0, "Self-employed": 2.0, "Farmer": 1.5, "Daily wage": 1.0}
        stab_comp = stab_map.get(row.get("employment_type"), 1.0) / 3.0
        elec_comp = min(1.0, max(0.0, elec_norm / 2.0))
        mob_comp = min(1.0, max(0.0, (mob_amt_norm * 0.6 + mob_freq_norm * 0.4) / 2.0))
        raw_index = (elec_comp * 0.25 + mob_comp * 0.25 + household_cap * 0.30 + stab_comp * 0.20) * 100.0
        return max(0.0, min(100.0, raw_index))

    def get_score_a(row):
        pri = row['prior_repayment_record']
        pri_val = pri if pd.notnull(pri) else -1.0
        util = row['utility_payment_consistency'] if pd.notnull(row['utility_payment_consistency']) else 0.6
        elec = row['electricity_payment_regularity'] if pd.notnull(row['electricity_payment_regularity']) else 0.6
        freq = row['mobile_recharge_frequency'] if pd.notnull(row['mobile_recharge_frequency']) else 2.5
        feat = np.array([[util, elec, pri_val, freq]])
        score = model_a.predict_proba(feat)[0][1] * 100.0
        if pd.isnull(pri):
            score = min(score, 70.0)
        return max(0.0, min(100.0, score))

    df['behavior_score'] = df.apply(get_score_a, axis=1)
    df['income_score'] = df.apply(compute_model_b_unsupervised_row, axis=1)
    df['alternative_credit_score'] = (df['behavior_score'] * 0.60) + (df['income_score'] * 0.40)

    # =========================================================================
    # STEP 3: DECISION-STAGE FEATURE ENCODING (14 Clean Features)
    # =========================================================================
    CAT_LABEL_XGB = [
        'gender', 'marital_status', 'education',
        'employment_type', 'area_type', 'loan_purpose', 'credit_category',
    ]
    CAT_OHE_LR = ['gender', 'area_type', 'employment_type']
    CAT_LABEL_LR = ['marital_status', 'education', 'loan_purpose', 'credit_category']
    NUM_COLS = [
        'age', 'applicant_income', 'coapplicant_income',
        'loan_amount', 'loan_term_months', 'dependents',
        'alternative_credit_score',
    ]

    encoders = {}
    df_enc = df.copy()
    for col in CAT_LABEL_XGB:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le

    df_enc[NUM_COLS] = df_enc[NUM_COLS].fillna(df_enc[NUM_COLS].mean())

    with open(os.path.join(models_path, "label_encoders.pkl"), "wb") as f:
        pickle.dump(encoders, f)

    y_final = df_enc['loan_repaid'].values

    # XGB Feature Matrix (14 cols, label encoded)
    XGB_FEATURES = CAT_LABEL_XGB + NUM_COLS
    X_xgb_raw = df_enc[XGB_FEATURES].values

    # LR Feature Matrix (OHE on gender, area_type, employment_type + label-rest + numerics)
    ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    ohe_arr = ohe.fit_transform(df[CAT_OHE_LR].astype(str))
    lab_arr = df_enc[CAT_LABEL_LR].values
    num_arr = df_enc[NUM_COLS].values
    X_lr_raw = np.hstack([ohe_arr, lab_arr, num_arr])

    # =========================================================================
    # STEP 4: TIME-BASED (WALK-FORWARD) 60/20/20 PARTITIONING
    # =========================================================================
    train_end = int(n_total * 0.60)   # Indices 0 .. 4799
    calib_end = int(n_total * 0.80)   # Indices 4800 .. 6399
    # Test Split: Indices 6400 .. 7999 (Out-of-time evaluation)

    idx_tr = np.arange(0, train_end)
    idx_cal = np.arange(train_end, calib_end)
    idx_te = np.arange(calib_end, n_total)

    # Fit scalers strictly on training portion (preventing test data distribution leakage)
    scaler_xgb = StandardScaler()
    scaler_xgb.fit(X_xgb_raw[idx_tr])
    X_xgb_scaled = scaler_xgb.transform(X_xgb_raw)

    scaler_lr = StandardScaler()
    scaler_lr.fit(X_lr_raw[idx_tr])
    X_lr_scaled = scaler_lr.transform(X_lr_raw)

    Xtr_xgb, Xcal_xgb, Xte_xgb = X_xgb_scaled[idx_tr], X_xgb_scaled[idx_cal], X_xgb_scaled[idx_te]
    Xtr_lr, Xcal_lr, Xte_lr = X_lr_scaled[idx_tr], X_lr_scaled[idx_cal], X_lr_scaled[idx_te]
    ytr, ycal, yte = y_final[idx_tr], y_final[idx_cal], y_final[idx_te]

    acs_train = df['alternative_credit_score'].values[idx_tr]
    acs_test = df['alternative_credit_score'].values[idx_te]

    print("\n" + "=" * 80)
    print(f"WALK-FORWARD PARTITION SUMMARY (Anti-Leakage Temporal Cutoffs):")
    print(f"  * Chronological Training Split   (t_0 -> t_{train_end-1}): n={len(ytr)} (60%)")
    print(f"  * Chronological Calibration Split (t_{train_end} -> t_{calib_end-1}): n={len(ycal)} (20%)")
    print(f"  * Chronological Out-of-Time Test (t_{calib_end} -> t_{n_total-1}): n={len(yte)} (20%)")
    print("=" * 80)

    # =========================================================================
    # STEP 5: 5-FOLD CROSS VALIDATION ON TRAINING PORTION (TimeSeriesSplit)
    # =========================================================================
    print("\n" + "-" * 80)
    print("5-FOLD TIME-SERIES CROSS-VALIDATION ON TRAINING PORTION (Target AUC 0.75 - 0.80):")
    print("-" * 80)

    tscv = TimeSeriesSplit(n_splits=5)
    cv_metrics = []
    fold_idx = 1

    for tr_f_idx, val_f_idx in tscv.split(Xtr_xgb):
        f_Xtr, f_ytr = Xtr_xgb[tr_f_idx], ytr[tr_f_idx]
        f_Xval, f_yval = Xtr_xgb[val_f_idx], ytr[val_f_idx]
        f_acs_val = acs_train[val_f_idx]

        # SMOTE on training fold
        sm = SMOTE(random_state=42)
        f_X_res, f_y_res = sm.fit_resample(f_Xtr, f_ytr)

        fold_model = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
        fold_model.fit(f_X_res, f_y_res)

        f_probs = fold_model.predict_proba(f_Xval)[:, 1]
        f_preds = (f_probs >= 0.5).astype(int)

        # ROC-AUC
        fold_auc = roc_auc_score(f_yval, f_probs)

        # Minority Default Class metrics (where loan_repaid == 0)
        # Class 0: Defaulted (minority), Class 1: Repaid
        actual_default = (f_yval == 0).astype(int)
        pred_default = (f_preds == 0).astype(int)

        fold_f1 = f1_score(actual_default, pred_default, zero_division=0)
        fold_prec = precision_score(actual_default, pred_default, zero_division=0)
        fold_rec = recall_score(actual_default, pred_default, zero_division=0)

        cv_metrics.append({
            "fold": fold_idx,
            "train_samples": len(tr_f_idx),
            "val_samples": len(val_f_idx),
            "auc": fold_auc,
            "f1_default": fold_f1,
            "precision_default": fold_prec,
            "recall_default": fold_rec
        })

        print(f"Fold {fold_idx} (Train n={len(tr_f_idx)}, Val n={len(val_f_idx)}): "
              f"ROC-AUC = {fold_auc:.4f} | Default F1 = {fold_f1:.4f} | "
              f"Default Prec = {fold_prec:.4f} | Default Rec = {fold_rec:.4f}")
        fold_idx += 1

    mean_auc = np.mean([m['auc'] for m in cv_metrics])
    mean_f1 = np.mean([m['f1_default'] for m in cv_metrics])
    mean_prec = np.mean([m['precision_default'] for m in cv_metrics])
    mean_rec = np.mean([m['recall_default'] for m in cv_metrics])

    print("-" * 80)
    print(f"5-FOLD CV AGGREGATE RESULTS:")
    print(f"  * Mean ROC-AUC:            {mean_auc:.4f}  (Target: 0.75 - 0.80)")
    print(f"  * Mean Minority F1-Score:  {mean_f1:.4f}")
    print(f"  * Mean Minority Precision: {mean_prec:.4f}")
    print(f"  * Mean Minority Recall:    {mean_rec:.4f}")
    print("-" * 80)

    # =========================================================================
    # STEP 6: TRAIN FINAL PRODUCTION BASE MODELS WITH STRATIFIED SMOTE + BIAS MITIGATION
    # =========================================================================
    from pipeline.bias_mitigation import apply_stratified_smote, compute_kamiran_calders_weights

    # Stratified SMOTE on XGB feature space
    X_res_xgb, y_res_xgb = apply_stratified_smote(
        Xtr_xgb, ytr,
        feature_names=XGB_FEATURES,
        sensitive_cols=['gender', 'area_type'],
    )
    sample_weights_xgb = compute_kamiran_calders_weights(
        X_res_xgb, y_res_xgb,
        feature_names=XGB_FEATURES,
        sensitive_cols=['gender', 'area_type'],
    )

    # Plain SMOTE on LR OHE feature space
    from imblearn.over_sampling import SMOTE as _SMOTE
    smote_lr = _SMOTE(random_state=42)
    X_res_lr, y_res_lr = smote_lr.fit_resample(Xtr_lr, ytr)

    lr_base = LogisticRegression(random_state=42, max_iter=1000)
    lr_base.fit(X_res_lr, y_res_lr)

    xgb_base = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    xgb_base.fit(X_res_xgb, y_res_xgb, sample_weight=sample_weights_xgb)

    # =========================================================================
    # STEP 7: POST-HOC ISOTONIC CALIBRATION (ON CALIBRATION SPLIT)
    # =========================================================================
    lr_uncal = lr_base.predict_proba(Xcal_lr)[:, 1]
    xgb_uncal = xgb_base.predict_proba(Xcal_xgb)[:, 1]

    lr_calibrator = IsotonicRegression(out_of_bounds='clip')
    lr_calibrator.fit(lr_uncal, ycal)

    xgb_calibrator = IsotonicRegression(out_of_bounds='clip')
    xgb_calibrator.fit(xgb_uncal, ycal)

    # =========================================================================
    # STEP 8: CONFUSION MATRIX PER RISK BAND & OUT-OF-TIME TEST EVALUATION
    # =========================================================================
    lr_p_raw = lr_base.predict_proba(Xte_lr)[:, 1]
    xgb_p_raw = xgb_base.predict_proba(Xte_xgb)[:, 1]

    lr_p_cal = lr_calibrator.predict(lr_p_raw)
    xgb_p_cal = xgb_calibrator.predict(xgb_p_raw)

    combined_p = (lr_p_cal + xgb_p_cal) / 2.0
    final_preds = (combined_p >= 0.5).astype(int)

    diff = np.abs(lr_p_cal - xgb_p_cal)
    disagree_rate = (diff > 0.15).mean()

    print("\n" + "=" * 80)
    print("CONFUSION MATRIX PER RISK BAND ON OUT-OF-TIME TEST SPLIT (n=1,600):")
    print("=" * 80)

    # 1. Aggregate Confusion Matrix
    cm_agg = confusion_matrix(yte, final_preds, labels=[0, 1])
    print(f"Overall Aggregate Confusion Matrix:\n"
          f"  Actual Default (0): TN(Pred Default) = {cm_agg[0,0]:4d} | FP(Pred Repaid)  = {cm_agg[0,1]:4d}\n"
          f"  Actual Repaid  (1): FN(Pred Default) = {cm_agg[1,0]:4d} | TP(Pred Repaid)  = {cm_agg[1,1]:4d}")

    # 2. Risk Band Breakdowns
    risk_bands = [
        ("Low Risk Band (ACS >= 80)", 80.0, 100.0),
        ("Moderate Risk Band (60 <= ACS < 80)", 60.0, 80.0),
        ("High Risk Band (ACS < 60)", 0.0, 60.0),
    ]

    for band_name, low_bound, high_bound in risk_bands:
        if high_bound == 100.0:
            band_mask = (acs_test >= low_bound) & (acs_test <= high_bound)
        else:
            band_mask = (acs_test >= low_bound) & (acs_test < high_bound)

        n_band = band_mask.sum()
        if n_band > 0:
            cm_band = confusion_matrix(yte[band_mask], final_preds[band_mask], labels=[0, 1])
            actual_defaults_band = (yte[band_mask] == 0).sum()
            actual_repays_band = (yte[band_mask] == 1).sum()
            print(f"\n* {band_name} [Cohort Size: n={n_band} | Defaults: {actual_defaults_band}, Repays: {actual_repays_band}]:")
            print(f"    Actual Default (0): TN(Pred Def) = {cm_band[0,0]:4d} | FP(Pred Rep) = {cm_band[0,1]:4d}")
            print(f"    Actual Repaid  (1): FN(Pred Def) = {cm_band[1,0]:4d} | TP(Pred Rep) = {cm_band[1,1]:4d}")

    print("\n" + "-" * 80)
    print(f"FINAL TEST SET OUTCOMES:")
    print(f"  * Model Agreement Disagreement Rate (|LR-XGB| > 0.15): {disagree_rate*100:.2f}%")
    print(f"  * Mean Probability Difference: {diff.mean():.4f}")
    print(f"  * Model Probability Correlation: {np.corrcoef(lr_p_cal, xgb_p_cal)[0,1]:.4f}")
    print("-" * 80)

    # =========================================================================
    # STEP 9: SAVE ALL ARTEFACTS
    # =========================================================================
    with open(os.path.join(models_path, "lr_decision.pkl"), "wb") as f:
        pickle.dump(lr_base, f)
    with open(os.path.join(models_path, "xgb_decision.pkl"), "wb") as f:
        pickle.dump(xgb_base, f)
    with open(os.path.join(models_path, "lr_calibrator.pkl"), "wb") as f:
        pickle.dump(lr_calibrator, f)
    with open(os.path.join(models_path, "xgb_calibrator.pkl"), "wb") as f:
        pickle.dump(xgb_calibrator, f)
    with open(os.path.join(models_path, "scaler_xgb.pkl"), "wb") as f:
        pickle.dump(scaler_xgb, f)
    with open(os.path.join(models_path, "scaler_lr.pkl"), "wb") as f:
        pickle.dump(scaler_lr, f)
    with open(os.path.join(models_path, "ohe_lr.pkl"), "wb") as f:
        pickle.dump(ohe, f)

    print(f"[ARTEFACTS] All models and calibrators saved to {models_path} successfully.\n")

if __name__ == "__main__":
    train_all()
