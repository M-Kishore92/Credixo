# backend/pipeline/alt_credit_score.py
import numpy as np
import os
import pickle

# Load Model B at module level
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
with open(os.path.join(MODELS_DIR, "model_b_income.pkl"), "rb") as f:
    model_b = pickle.load(f)

def compute_alternative_credit_score(row, norm_data, engineered_features):
    """
    Computes the two-model Alternative Credit Score (ACS).
    """
    # 1. MODEL A — Behavior & Repayment Score
    # Raw formula implementation as per spec
    prior = row.get("prior_repayment_record") # 0.35, 0.62, 0.82, 0.95 or None
    util = norm_data["utility_payment_consistency"]
    elec = norm_data["electricity_payment_regularity"]
    
    both_signals_missing = norm_data["elec_reg_missing"] and norm_data["util_cons_missing"]
    
    score_a_penalty = 1.0
    # Impute missing with 0.6 and apply penalty
    if norm_data["elec_reg_missing"]:
        elec = 0.6
        score_a_penalty *= 0.8
    if norm_data["util_cons_missing"]:
        util = 0.6
        score_a_penalty *= 0.8
        
    if prior is None:
        # First-time borrower branch
        # util (0.55), elec (0.45)
        score_a = (util * 0.55 + elec * 0.45) * 100
        score_a = min(score_a * score_a_penalty, 70) # Hard cap for first-time
    else:
        # Full weighting
        score_a = (util * 0.40 + elec * 0.30 + prior * 0.30) * 100
        score_a = score_a * score_a_penalty

    # 2. MODEL B — Income & Affordability Score
    # Prepare feature vector for Model B
    # Features: electricity_bill_avg (norm), mobile_recharge_avg (norm), 
    # mobile_recharge_frequency (norm), govt_category_encoded, applicant_income (log), 
    # coapplicant_income (log), debt_to_income, household_burden, employment_stability
    
    b_features = [
        norm_data["electricity_bill_avg_norm"] if norm_data["electricity_bill_avg_norm"] is not None else 0.5, # mean impute
        norm_data["mobile_recharge_avg_norm"] if norm_data["mobile_recharge_avg_norm"] is not None else 0.5,
        norm_data["mobile_recharge_frequency_norm"] if norm_data["mobile_recharge_frequency_norm"] is not None else 1.0,
        norm_data["govt_category_encoded"],
        np.log1p(row.get("applicant_income", 0)),
        np.log1p(row.get("coapplicant_income", 0)),
        engineered_features["debt_to_income"],
        engineered_features["household_burden"],
        engineered_features["employment_stability"]
    ]
    
    # Model B input usually needs to be a 2D array
    score_b_raw = model_b.predict(np.array(b_features).reshape(1, -1))[0] * 100
    
    # Missing data penalties for Model B
    score_b_multiplier = 1.0
    if norm_data["electricity_bill_avg_norm"] is None: score_b_multiplier *= 0.85
    if norm_data["mobile_recharge_avg_norm"] is None: score_b_multiplier *= 0.90
    if norm_data["mobile_recharge_frequency_norm"] is None: score_b_multiplier *= 0.90
    
    score_b = max(0, min(100, score_b_raw * score_b_multiplier))
    
    # 3. Final Composite
    alternative_credit_score = (score_a * 0.60) + (score_b * 0.40)
    
    # Override Caps
    if both_signals_missing:
        alternative_credit_score = min(alternative_credit_score, 65)
    
    if prior is None:
        alternative_credit_score = min(alternative_credit_score, 65)
        
    return {
        "behavior_repayment_score": round(score_a, 1),
        "income_affordability_score": round(score_b, 1),
        "alternative_credit_score": round(alternative_credit_score, 1),
        "score_flags": {
            "both_signals_missing": both_signals_missing,
            "first_time_borrower": prior is None
        }
    }
