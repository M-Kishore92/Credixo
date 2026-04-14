# backend/pipeline/preprocess.py
import numpy as np
import os
import pickle

# Load models directory from env or use default
MODELS_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models"))

if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")

with open(os.path.join(MODELS_DIR, "label_encoders.pkl"), "rb") as f:
    encoders = pickle.load(f)
with open(os.path.join(MODELS_DIR, "scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)

def preprocess_for_decision(raw_data, normalized_data, engineered_features, acs_results):
    """
    Builds the full feature vector for the decision models (LR and XGB).
    """
    # 1. Collect all features in the order expected by the training script:
    # cat_cols + num_cols
    
    cat_cols = ['gender', 'marital_status', 'education', 'employment_type', 'area_type', 'loan_purpose', 'credit_score_category', 'govt_socioeconomic_category']
    num_cols = ['age', 'applicant_income', 'coapplicant_income', 'loan_amount', 'loan_term', 'dependents', 'electricity_bill_avg', 'electricity_payment_regularity', 'mobile_recharge_amount', 'mobile_recharge_frequency', 'utility_payment_consistency', 'prior_repayment_record', 'alternative_credit_score']
    
    feature_vector = []
    
    # 2. Encode Categoricals
    for col in cat_cols:
        val = str(raw_data.get(col, ""))
        le = encoders.get(col if col != "credit_score_category" else "credit_category")
        # Handle unseen labels by mapping to a safe default if needed
        try:
            encoded_val = le.transform([val])[0]
        except ValueError:
            # Fallback to the first class if unknown
            encoded_val = 0
        feature_vector.append(encoded_val)
        
    # 3. Add Numerics
    # Fill missing values with reasonable defaults for the final decision model
    for col in num_cols:
        if col == "alternative_credit_score":
            val = acs_results["alternative_credit_score"]
        else:
            val = raw_data.get(col)
            if val is None or (isinstance(val, float) and np.isnan(val)):
                # Default values consistent with training phase mean imputation
                defaults = {
                    "age": 38,
                    "applicant_income": 15000,
                    "coapplicant_income": 0,
                    "loan_amount": 50000,
                    "loan_term": 36,
                    "dependents": 2,
                    "electricity_bill_avg": 600,
                    "electricity_payment_regularity": 0.6,
                    "mobile_recharge_amount": 300,
                    "mobile_recharge_frequency": 2.5,
                    "utility_payment_consistency": 0.6,
                    "prior_repayment_record": -1
                }
                val = defaults.get(col, 0)
        feature_vector.append(val)
        
    # 4. Scale
    X = np.array(feature_vector).reshape(1, -1)
    X_scaled = scaler.transform(X)
    
    return X_scaled, X # returning raw too for SHAP
