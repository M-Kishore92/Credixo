# backend/train_models.py
import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from xgboost import XGBClassifier
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE

def train_all():
    base_path = os.path.dirname(__file__)
    data_path = os.path.join(base_path, "data", "synthetic_loan_data.csv")
    models_path = os.path.join(os.path.dirname(base_path), "models")
    
    if not os.path.exists(models_path):
        os.makedirs(models_path)
        
    df = pd.read_csv(data_path)
    
    # --- MODEL A: Behavior Score ---
    # Features: utility_payment_consistency, electricity_payment_regularity, prior_repayment_record, mobile_recharge_frequency
    features_a = ['utility_payment_consistency', 'electricity_payment_regularity', 'prior_repayment_record', 'mobile_recharge_frequency']
    df_a = df[features_a + ['loan_repaid']].copy()
    # Handle nulls: impute prior_repayment nulls with -1
    df_a['prior_repayment_record'] = df_a['prior_repayment_record'].fillna(-1)
    # Simple mean imputation for others just for the base model A training
    df_a['utility_payment_consistency'] = df_a['utility_payment_consistency'].fillna(0.6)
    df_a['electricity_payment_regularity'] = df_a['electricity_payment_regularity'].fillna(0.6)
    df_a['mobile_recharge_frequency'] = df_a['mobile_recharge_frequency'].fillna(2.5)
    
    X_a = df_a[features_a]
    y_a = df_a['loan_repaid']
    
    X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(X_a, y_a, test_size=0.2, random_state=42)
    
    smote = SMOTE(random_state=42)
    X_res_a, y_res_a = smote.fit_resample(X_train_a, y_train_a)
    
    model_a = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    model_a.fit(X_res_a, y_res_a)
    
    with open(os.path.join(models_path, "model_a_behavior.pkl"), "wb") as f:
        pickle.dump(model_a, f)
        
    # --- MODEL B: Income Score ---
    # Target: income_adequacy_label (top 20% = 1.0, etc.)
    df_b = df.copy()
    df_b['income_adequacy_label'] = pd.qcut(df_b['applicant_income'], 5, labels=[0.2, 0.4, 0.6, 0.8, 1.0]).astype(float)
    
    # Features: electricity_bill_avg, mobile_recharge_avg, mobile_recharge_frequency, govt_category_encoded, applicant_income (log), coapplicant_income (log), debt_to_income, household_burden, employment_stability
    # (Need to compute these for training set)
    def compute_b_features(row):
        govt_map = {"BPL": 1.0, "APL": 0.5, "None": 0.0}
        stab_map = {"Salaried": 3.0, "Self-employed": 2.0, "Farmer": 1.5, "Daily wage": 1.0}
        
        dti = min(20.0, row['loan_amount'] / row['applicant_income'] if row['applicant_income'] > 0 else 20.0)
        total_inc = row['applicant_income'] + row['coapplicant_income']
        burden = min(5.0, row['dependents'] / total_inc if total_inc > 0 else (5.0 if row['dependents'] > 0 else 0))
        
        return pd.Series({
            "electricity_bill_avg": row['electricity_bill_avg'],
            "mobile_recharge_avg": row['mobile_recharge_avg'],
            "mobile_recharge_frequency": row['mobile_recharge_frequency'],
            "govt_category_encoded": govt_map.get(row['govt_socioeconomic_category'], 0.0),
            "applicant_income_log": np.log1p(row['applicant_income']),
            "coapplicant_income_log": np.log1p(row['coapplicant_income']),
            "debt_to_income": dti,
            "household_burden": burden,
            "employment_stability": stab_map.get(row['employment_type'], 1.0)
        })

    X_b = df_b.apply(compute_b_features, axis=1)
    # Fill nan for training speed
    X_b = X_b.fillna(X_b.mean())
    y_b = df_b['income_adequacy_label']
    
    model_b = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model_b.fit(X_b, y_b)
    
    with open(os.path.join(models_path, "model_b_income.pkl"), "wb") as f:
        pickle.dump(model_b, f)


    # --- FINAL PREPARATION & DECISION MODELS ---
    # We need to compute Model A and Model B scores for all data rows to use as features for Model C (Decision)
    
    # Function to get behavioral score (mimicking pipeline logic)
    def get_score_a(row):
        # Reweight logic as per requirements
        pri = row['prior_repayment_record']
        util = row['utility_payment_consistency'] if pd.notnull(row['utility_payment_consistency']) else 0.6
        elec = row['electricity_payment_regularity'] if pd.notnull(row['electricity_payment_regularity']) else 0.6
        
        if pd.isnull(pri):
            # First-time borrower
            score = (util * 0.55 + elec * 0.45) * 100
            return min(score, 70)
        else:
            return (util * 0.40 + elec * 0.30 + pri * 0.30) * 100

    def get_score_b(row):
        # We can just use the fitted model B here for simplicity in data gen
        # In reality, this would be the regressor output
        feat_row = compute_b_features(row).fillna(X_b.mean()) # using means from X_b
        return model_b.predict(feat_row.values.reshape(1, -1))[0] * 100

    df['behavior_score'] = df.apply(get_score_a, axis=1)
    df['income_score'] = df.apply(get_score_b, axis=1)
    df['alternative_credit_score'] = (df['behavior_score'] * 0.6) + (df['income_score'] * 0.4)
    
    # Final Decision Model Features
    cat_cols = ['gender', 'marital_status', 'education', 'employment_type', 'area_type', 'loan_purpose', 'credit_category', 'govt_socioeconomic_category']
    num_cols = ['age', 'applicant_income', 'coapplicant_income', 'loan_amount', 'loan_term_months', 'dependents', 'electricity_bill_avg', 'electricity_payment_regularity', 'mobile_recharge_avg', 'mobile_recharge_frequency', 'utility_payment_consistency', 'prior_repayment_record', 'alternative_credit_score']
    
    # Process Categorical
    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    
    with open(os.path.join(models_path, "label_encoders.pkl"), "wb") as f:
        pickle.dump(encoders, f)
        
    # Process Numerical
    df[num_cols] = df[num_cols].fillna(df[num_cols].mean())
    
    X_final = df[cat_cols + num_cols]
    y_final = df['loan_repaid']
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_final)
    
    with open(os.path.join(models_path, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
        
    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X_scaled, y_final, test_size=0.2, random_state=42)
    
    # SMOTE for decision model
    res_f = SMOTE(random_state=42)
    X_res_f, y_res_f = res_f.fit_resample(X_train_f, y_train_f)
    
    lr_model = LogisticRegression(random_state=42)
    lr_model.fit(X_res_f, y_res_f)
    
    xgb_model = XGBClassifier(n_estimators=100, random_state=42)
    xgb_model.fit(X_res_f, y_res_f)
    
    with open(os.path.join(models_path, "lr_decision.pkl"), "wb") as f:
        pickle.dump(lr_model, f)
    
    with open(os.path.join(models_path, "xgb_decision.pkl"), "wb") as f:
        pickle.dump(xgb_model, f)
        
    print("All models trained and saved to models/ directory.")

if __name__ == "__main__":
    train_all()
