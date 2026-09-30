# backend/pipeline/explainer.py
"""
Multi-Model SHAP & Surrogate Explainability Layer.

Runs explainers separately across all scoring layers:
  1. Model A (Behavior Model): shap.TreeExplainer on model_a_behavior.pkl (4 behavioral inputs)
  2. Model B (Income Composite): Exact linear surrogate attribution on 5 composite components
  3. Decision Stage Model: shap.TreeExplainer on xgb_decision.pkl (14 decision features)
"""
import os
import pickle
import numpy as np
import shap
from typing import Dict, Any, Optional

MODELS_DIR = os.getenv(
    "MODEL_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
)
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")

# Load models
xgb_decision_model = None
model_a_behavior_model = None

try:
    with open(os.path.join(MODELS_DIR, "xgb_decision.pkl"), "rb") as f:
        xgb_decision_model = pickle.load(f)
except Exception as e:
    print(f"[EXPLAINER] Failed to load xgb_decision.pkl: {e}")

try:
    with open(os.path.join(MODELS_DIR, "model_a_behavior.pkl"), "rb") as f:
        model_a_behavior_model = pickle.load(f)
except Exception as e:
    print(f"[EXPLAINER] Failed to load model_a_behavior.pkl: {e}")

_decision_explainer = None
_model_a_explainer = None

def get_decision_explainer():
    global _decision_explainer
    if _decision_explainer is None and xgb_decision_model is not None:
        try:
            _decision_explainer = shap.TreeExplainer(xgb_decision_model)
        except Exception as e:
            print(f"[EXPLAINER] Decision TreeExplainer initialization failed: {e}")
            return None
    return _decision_explainer

def get_model_a_explainer():
    global _model_a_explainer
    if _model_a_explainer is None and model_a_behavior_model is not None:
        try:
            _model_a_explainer = shap.TreeExplainer(model_a_behavior_model)
        except Exception as e:
            print(f"[EXPLAINER] Model A TreeExplainer initialization failed: {e}")
            return None
    return _model_a_explainer

# Decision Stage Feature Names (14 features)
XGB_FEATURE_NAMES = [
    'gender', 'marital_status', 'education', 'employment_type',
    'area_type', 'loan_purpose', 'credit_category',
    'age', 'applicant_income', 'coapplicant_income',
    'loan_amount', 'loan_term_months', 'dependents',
    'alternative_credit_score',
]

# Model A Feature Names (4 features)
MODEL_A_FEATURE_NAMES = [
    'utility_payment_consistency',
    'electricity_payment_regularity',
    'prior_repayment_record',
    'mobile_recharge_frequency',
]

# Model B Component Names (5 features)
MODEL_B_FEATURE_NAMES = [
    'electricity_spending',
    'mobile_spending',
    'mobile_frequency',
    'household_capacity',
    'employment_stability',
]

SHAP_REASON_MAP = {
    'alternative_credit_score': "Your alternative credit score was below the benchmark for this loan size.",
    'loan_amount': "The requested loan amount is high for the verified repayment capacity.",
    'applicant_income': "Declared monthly income is below the threshold for this loan size.",
    'coapplicant_income': "No co-applicant income declared to support repayment capacity.",
    'loan_term_months': "Longer loan terms carry higher maturity and repayment volatility risk.",
    'dependents': "High number of dependents impacts household disposable income.",
    'age': "Age profile impacts the long-term risk assessment for this loan term.",
    'employment_type': "Employment type carries higher income instability risk.",
    'area_type': "Regional risk factors impact the overall scoring.",
    'gender': "Demographic variance in repayment patterns for this cluster.",
    'marital_status': "Marital status is considered in household stability calculations.",
    'education': "Education level is factored into long-term income stability projections.",
    'loan_purpose': "Loan purpose risk category impacts the final threshold.",
    'credit_category': "Credit history category is insufficient for this loan amount.",
    'utility_payment_consistency': "Inconsistent utility bill payments reduce your behavioral score.",
    'electricity_payment_regularity': "Irregular electricity bill payments indicate repayment risk.",
    'prior_repayment_record': "No prior loan repayment history is available to verify reliability.",
    'mobile_recharge_frequency': "Recharge frequency profile indicates financial volatility.",
    'electricity_spending': "Electricity usage patterns suggest lower economic activity than required.",
    'mobile_spending': "Mobile spending pattern suggests limited discretionary income.",
    'household_capacity': "Household financial capacity index suggests constrained cash flows.",
    'employment_stability': "Income stability ranking indicates higher cash flow volatility.",
}


def explain_model_a(norm_data: dict, prior_repayment: Optional[float] = None, mobile_freq: Optional[float] = None) -> Dict[str, float]:
    """
    Computes TreeExplainer SHAP values specifically for Model A (Behavioral XGBoost).
    """
    explainer_a = get_model_a_explainer()
    if explainer_a is None:
        return {k: 0.0 for k in MODEL_A_FEATURE_NAMES}

    try:
        util_val = norm_data.get("utility_payment_consistency")
        elec_val = norm_data.get("electricity_payment_regularity")
        pri_val = prior_repayment if prior_repayment is not None else -1.0
        frq_val = mobile_freq if mobile_freq is not None else 2.5

        feat_a = np.array([[
            util_val if util_val is not None else 0.6,
            elec_val if elec_val is not None else 0.6,
            pri_val,
            frq_val
        ]], dtype=float)

        shap_vals_a = explainer_a.shap_values(feat_a)[0]
        return {name: float(val) for name, val in zip(MODEL_A_FEATURE_NAMES, shap_vals_a)}
    except Exception as e:
        print(f"[EXPLAINER] Model A SHAP failed: {e}")
        return {k: 0.0 for k in MODEL_A_FEATURE_NAMES}


def explain_model_b(norm_data: dict, engineered: dict) -> Dict[str, float]:
    """
    Computes exact linear surrogate attribution for Model B (Unsupervised Composite Index).
    Surrogate attribution = weight_i * (normalized_val_i - baseline_mean_i).
    """
    weights = {
        "electricity_spending": 0.25,
        "mobile_spending": 0.15,
        "mobile_frequency": 0.10,
        "household_capacity": 0.30,
        "employment_stability": 0.20
    }
    baselines = {
        "electricity_spending": 0.50,
        "mobile_spending": 0.50,
        "mobile_frequency": 0.50,
        "household_capacity": 0.50,
        "employment_stability": 0.50
    }
    
    elec_norm = min(1.0, max(0.0, float(norm_data.get("electricity_bill_avg_norm") or 1.0) / 2.0))
    mob_amt_norm = min(1.0, max(0.0, float(norm_data.get("mobile_recharge_amount_norm") or 1.0) / 2.0))
    mob_freq_norm = min(1.0, max(0.0, float(norm_data.get("mobile_recharge_frequency_norm") or 1.0) / 2.0))
    hh_cap = min(1.0, max(0.0, 1.0 - float(engineered.get("household_burden") or 0.5)))
    emp_stab = min(1.0, max(0.0, float(engineered.get("employment_stability") or 1.5) / 3.0))

    vals = {
        "electricity_spending": elec_norm,
        "mobile_spending": mob_amt_norm,
        "mobile_frequency": mob_freq_norm,
        "household_capacity": hh_cap,
        "employment_stability": emp_stab
    }

    # Attribution relative to baseline 50.0 mid-point
    attributions = {}
    for k in MODEL_B_FEATURE_NAMES:
        attributions[k] = round(weights[k] * (vals[k] - baselines[k]) * 100.0, 3)

    return attributions


def explain_decision(X_dict: dict, raw_data: Optional[dict] = None, norm_data: Optional[dict] = None, engineered: Optional[dict] = None) -> dict:
    """
    Computes unified multi-level explanations:
      1. Decision stage TreeExplainer SHAP values
      2. Model A TreeExplainer SHAP values
      3. Model B Linear Surrogate attributions
      4. Human-interpretable top negative driver reasons
    """
    X_xgb = X_dict.get("xgb") if isinstance(X_dict, dict) else X_dict
    explainer = get_decision_explainer()

    decision_shap = {}
    if explainer is not None and X_xgb is not None:
        try:
            shap_vals = explainer.shap_values(X_xgb)[0]
            decision_shap = {name: float(val) for name, val in zip(XGB_FEATURE_NAMES, shap_vals)}
        except Exception as e:
            print(f"[EXPLAINER] Decision SHAP computation failed: {e}")
            decision_shap = {name: 0.0 for name in XGB_FEATURE_NAMES}
    else:
        decision_shap = {name: 0.0 for name in XGB_FEATURE_NAMES}

    # Model A SHAP
    raw_dict = raw_data or {}
    norm_dict = norm_data or {}
    model_a_shap = explain_model_a(
        norm_dict,
        prior_repayment=raw_dict.get("prior_repayment_record"),
        mobile_freq=raw_dict.get("mobile_recharge_frequency")
    )

    # Model B SHAP Surrogate
    model_b_shap = explain_model_b(norm_dict, engineered or {})

    # Determine Top 2 Negative Reasons (from Decision and Model A drivers)
    combined_drivers = {}
    for k, v in decision_shap.items():
        combined_drivers[k] = v
    for k, v in model_a_shap.items():
        if k not in combined_drivers or abs(v) > abs(combined_drivers[k]):
            combined_drivers[k] = v

    sorted_features = sorted(combined_drivers.items(), key=lambda x: x[1])

    top_reason_1 = SHAP_REASON_MAP.get(
        sorted_features[0][0],
        f"Feature '{sorted_features[0][0]}' was the primary negative factor."
    )
    top_reason_2 = SHAP_REASON_MAP.get(
        sorted_features[1][0] if len(sorted_features) > 1 else sorted_features[0][0],
        f"Feature '{sorted_features[1][0]}' was the secondary negative factor."
    )

    return {
        "top_reason_1": top_reason_1,
        "top_reason_2": top_reason_2,
        "shap_values": decision_shap,
        "model_a_shap": model_a_shap,
        "model_b_shap": model_b_shap,
    }
