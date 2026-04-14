# backend/pipeline/explainer.py
import os
import pickle
import shap

# Load models directory from env or use default
MODELS_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models"))

if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")

# Load model at load time
with open(os.path.join(MODELS_DIR, "xgb_decision.pkl"), "rb") as f:
    xgb_model = pickle.load(f)

_explainer = None

def get_explainer():
    global _explainer
    if _explainer is None:
        try:
            # Uses TreeExplainer for efficiency with XGBoost
            _explainer = shap.TreeExplainer(xgb_model)
        except Exception as e:
            print(f"SHAP Explainer initialization failed: {e}")
            return None
    return _explainer

SHAP_REASON_MAP = {
    "alternative_credit_score": "Your behavioral credit score was below the threshold for this loan amount.",
    "debt_to_income": "The loan amount is high relative to your declared income.",
    "household_burden": "The number of financial dependents creates significant household burden.",
    "electricity_payment_regularity": "Irregular electricity bill payments indicate repayment risk.",
    "utility_payment_consistency": "Inconsistent utility bill payments reduce your behavior score.",
    "prior_repayment_record": "No prior loan repayment history is available to verify repayment reliability.",
    "applicant_income": "Declared monthly income is below the threshold for this loan size.",
    "employment_stability": "Employment type carries higher income instability risk.",
    "mobile_recharge_amount": "Mobile usage pattern suggests limited discretionary income.",
    "coapplicant_income": "No co-applicant income declared to support repayment capacity.",
    "credit_score_category": "Credit history category is insufficient for this loan amount.",
    "loan_amount": "The requested loan amount is high for the current financial profile.",
    "age": "Age profile impacts the long-term risk assessment for this loan term.",
    "education": "Education level is factored into long-term income stability projections.",
    "gender": "Demographic variance in repayment patterns for this cluster.",
    "area_type": "Regional risk factors impact the overall scoring.",
    "marital_status": "Marital status is considered in household stability calcuations.",
    "loan_purpose": "Loan purpose risk category impacts the final threshold.",
    "loan_term_months": "Longer loan terms carry higher maturity risk.",
    "dependents": "High number of dependents impacts repayment capacity.",
    "electricity_bill_avg": "Electricity usage patterns suggest lower economic activity than required.",
    "mobile_recharge_frequency": "Recharge frequency profile indicates financial volatility.",
    "govt_socioeconomic_category": "Government socioeconomic classification is considered in the risk model."
}

def explain_decision(X_scaled):
    """
    Computes SHAP values and generates top reasons for the decision.
    """
    # Feature names in order (matching preprocess.py)
    feature_names = [
        'gender', 'marital_status', 'education', 'employment_type', 'area_type', 'loan_purpose', 'credit_score_category', 'govt_socioeconomic_category',
        'age', 'applicant_income', 'coapplicant_income', 'loan_amount', 'loan_term', 'dependents', 'electricity_bill_avg', 'electricity_payment_regularity', 'mobile_recharge_amount', 'mobile_recharge_frequency', 'utility_payment_consistency', 'prior_repayment_record', 'alternative_credit_score'
    ]

    explainer = get_explainer()
    
    if explainer is None:
        # Fallback if SHAP is broken
        return {
            "top_reason_1": "Primary factors include credit history and income stability.",
            "top_reason_2": "Secondary factors include household burden and loan-to-income ratio.",
            "shap_values": {name: 0.0 for name in feature_names}
        }

    # X_scaled is 1xN array
    shap_vals = explainer.shap_values(X_scaled)[0]
    
    # Map feature names to SHAP values
    shap_dict = {name: float(val) for name, val in zip(feature_names, shap_vals)}
    
    # Find two most negative SHAP values (reasons for rejection/lower score)
    sorted_features = sorted(shap_dict.items(), key=lambda x: x[1]) # ascending (most negative first)
    
    top_reason_1 = SHAP_REASON_MAP.get(sorted_features[0][0], f"Feature {sorted_features[0][0]} impacted the decision.")
    top_reason_2 = SHAP_REASON_MAP.get(sorted_features[1][0], f"Feature {sorted_features[1][0]} impacted the decision.")
    
    return {
        "top_reason_1": top_reason_1,
        "top_reason_2": top_reason_2,
        "shap_values": shap_dict
    }
