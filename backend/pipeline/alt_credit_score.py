# backend/pipeline/alt_credit_score.py
import numpy as np
import os
import pickle

# Load models directory from env or use default
MODELS_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models"))

if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")

# Load Model A (Trained XGBoost Classifier on behavioral features)
model_a_trained = None
try:
    model_a_path = os.path.join(MODELS_DIR, "model_a_behavior.pkl")
    if os.path.exists(model_a_path):
        with open(model_a_path, "rb") as f:
            model_a_trained = pickle.load(f)
except Exception as e:
    print(f"[MODEL A] Failed to load model_a_behavior.pkl: {e}")

def _compute_model_a_rule_based_fallback(row, norm_data, verification_sources=None):
    """
    Rule-Based Scorecard (Fallback): Weighted-average renormalization scorecard for Model A.
    Weights aa_verified/uli_verified fields at 1.0x and self_reported fields at 0.75x.
    """
    verif = (verification_sources or {}).get("sources", {})
    prior = row.get("prior_repayment_record")
    util = norm_data.get("utility_payment_consistency")
    elec = norm_data.get("electricity_payment_regularity")
    
    base_weights = {
        "utility_payment_consistency": 0.40,
        "electricity_payment_regularity": 0.30,
        "prior_repayment_record": 0.30
    }
    
    available = {}
    eff_weights = {}
    
    if util is not None:
        available["utility_payment_consistency"] = float(util)
        mult = 1.0 if verif.get("utility_payment_consistency") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["utility_payment_consistency"] = base_weights["utility_payment_consistency"] * mult
        
    if elec is not None:
        available["electricity_payment_regularity"] = float(elec)
        mult = 1.0 if verif.get("electricity_payment_regularity") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["electricity_payment_regularity"] = base_weights["electricity_payment_regularity"] * mult
        
    if prior is not None:
        available["prior_repayment_record"] = float(prior)
        mult = 1.0 if verif.get("prior_repayment_record") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["prior_repayment_record"] = base_weights["prior_repayment_record"] * mult
        
    if not available:
        return 50.0
        
    total_weight = sum(eff_weights[k] for k in available)
    score_a = sum((eff_weights[k] / total_weight) * (available[k] * 100.0) for k in available)
    
    if prior is None:
        score_a = min(score_a, 70.0) # First-time borrower cap
        
    return max(0.0, min(100.0, score_a))

def _compute_model_b_unsupervised_index(norm_data, engineered_features, verification_sources=None):
    """
    Model B: Unsupervised Weighted Composite Index (0-100).
    Weights aa_verified/uli_verified fields at 1.0x and self_reported fields at 0.75x.
    """
    verif = (verification_sources or {}).get("sources", {})
    base_weights = {
        "electricity_spending": 0.25,
        "mobile_spending": 0.15,
        "mobile_frequency": 0.10,
        "household_capacity": 0.30,
        "employment_stability": 0.20
    }
    
    available = {}
    eff_weights = {}
    
    if norm_data.get("electricity_bill_avg_norm") is not None:
        available["electricity_spending"] = min(1.0, max(0.0, float(norm_data["electricity_bill_avg_norm"]) / 2.0))
        mult = 1.0 if verif.get("electricity_bill_avg") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["electricity_spending"] = base_weights["electricity_spending"] * mult
        
    if norm_data.get("mobile_recharge_amount_norm") is not None:
        available["mobile_spending"] = min(1.0, max(0.0, float(norm_data["mobile_recharge_amount_norm"]) / 2.0))
        mult = 1.0 if verif.get("mobile_recharge_amount") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["mobile_spending"] = base_weights["mobile_spending"] * mult
        
    if norm_data.get("mobile_recharge_frequency_norm") is not None:
        available["mobile_frequency"] = min(1.0, max(0.0, float(norm_data["mobile_recharge_frequency_norm"]) / 2.0))
        mult = 1.0 if verif.get("mobile_recharge_frequency") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["mobile_frequency"] = base_weights["mobile_frequency"] * mult
        
    if engineered_features.get("household_burden") is not None:
        cap = 1.0 - float(engineered_features["household_burden"])
        available["household_capacity"] = min(1.0, max(0.0, cap))
        # Household capacity verified if income is verified
        mult = 1.0 if verif.get("applicant_income") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["household_capacity"] = base_weights["household_capacity"] * mult
        
    if engineered_features.get("employment_stability") is not None:
        stab = float(engineered_features["employment_stability"]) / 3.0
        available["employment_stability"] = min(1.0, max(0.0, stab))
        mult = 1.0 if verif.get("applicant_income") in ["aa_verified", "uli_verified"] else 0.75
        eff_weights["employment_stability"] = base_weights["employment_stability"] * mult
        
    if not available:
        return 50.0
        
    total_weight = sum(eff_weights[k] for k in available)
    score_b = sum((eff_weights[k] / total_weight) * (available[k] * 100.0) for k in available)
    return max(0.0, min(100.0, score_b))

def compute_alternative_credit_score(row, norm_data, engineered_features, verification_sources=None):
    """
    Computes the two-model Alternative Credit Score (ACS) with 0.60/0.40 composite weighting.
    """
    prior = row.get("prior_repayment_record")
    elec_missing = norm_data.get("electricity_payment_regularity") is None
    util_missing = norm_data.get("utility_payment_consistency") is None
    both_signals_missing = elec_missing and util_missing
    
    # --- 1. MODEL A: Primary Trained XGBoost with Rule-Based Scorecard Fallback ---
    score_a = None
    scoring_mode = "trained_model"
    
    # If key signals are missing, use Rule-Based Scorecard with exact weight renormalization
    if both_signals_missing:
        scoring_mode = "rule_based_fallback"
        score_a = _compute_model_a_rule_based_fallback(row, norm_data, verification_sources)
    elif model_a_trained is not None:
        try:
            util_val = norm_data["utility_payment_consistency"] if norm_data["utility_payment_consistency"] is not None else 0.6
            elec_val = norm_data["electricity_payment_regularity"] if norm_data["electricity_payment_regularity"] is not None else 0.6
            prior_val = float(prior) if prior is not None else -1.0
            freq_val = float(row.get("mobile_recharge_frequency") or 2.5)
            
            feat_a = np.array([[util_val, elec_val, prior_val, freq_val]])
            prob_repaid = float(model_a_trained.predict_proba(feat_a)[0][1])
            score_a = prob_repaid * 100.0
            
            # If self-reported, adjust confidence slightly
            is_verified = (verification_sources or {}).get("sources", {}).get("electricity_payment_regularity") in ["aa_verified", "uli_verified"]
            if not is_verified:
                score_a *= 0.95
                
            if prior is None:
                score_a = min(score_a, 70.0)
        except Exception as e:
            print(f"[MODEL A] Inference failed, falling back to Rule-Based Scorecard: {e}")
            score_a = None
            
    if score_a is None:
        scoring_mode = "rule_based_fallback"
        score_a = _compute_model_a_rule_based_fallback(row, norm_data, verification_sources)
        
    score_a = max(0.0, min(100.0, score_a))

    # --- 2. MODEL B: Unsupervised Weighted Composite Index with Weight Renormalization ---
    score_b = _compute_model_b_unsupervised_index(norm_data, engineered_features, verification_sources)

    # --- 3. Final Composite (0.60 * Model A + 0.40 * Model B) ---
    alternative_credit_score = (score_a * 0.60) + (score_b * 0.40)
    
    # Safety Override Caps
    if both_signals_missing:
        alternative_credit_score = min(alternative_credit_score, 65.0)
    if prior is None:
        alternative_credit_score = min(alternative_credit_score, 65.0)
        
    return {
        "behavior_repayment_score": round(score_a, 1),
        "income_affordability_score": round(score_b, 1),
        "alternative_credit_score": round(alternative_credit_score, 1),
        "scoring_mode": scoring_mode,
        "model_a_label": "Trained XGBoost Classifier (demo-stage, proxy data)" if scoring_mode == "trained_model" else "Rule-Based Scorecard (Fallback)",
        "model_b_scoring_mode": "unsupervised_composite_index",
        "income_affordability_label": "estimated, not verified",
        "accuracy_disclaimer": "demo-stage, proxy data",
        "score_flags": {
            "both_signals_missing": both_signals_missing,
            "first_time_borrower": prior is None
        }
    }


