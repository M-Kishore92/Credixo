# backend/pipeline/decision_engine.py
from monitoring.drift_fallback import is_drift_fallback_active

def evaluate_safety_override(electricity_regularity, utility_consistency, alternative_credit_score):
    """
    Explicit, isolated unconditional safety override rule evaluated FIRST before any threshold comparison:
    if electricity_regularity is null AND utility_consistency is null:
        alternative_credit_score = min(alternative_credit_score, 65)
        ai_decision = "Human Review"
    """
    if electricity_regularity is None and utility_consistency is None:
        capped_score = min(float(alternative_credit_score), 65.0)
        return True, capped_score, "Human Review"
    return False, float(alternative_credit_score), None

def route_decision(alternative_credit_score, combined_score, uncertain, fairness_flag, score_flags,
                   electricity_regularity=None, utility_consistency=None, data_completeness_pct=100.0,
                   majority_self_reported=False):
    """
    Final routing logic to assemble the global decision.
    """
    # Step 0: Automated Drift Fallback safety rule
    # If statistical drift exceeds hard thresholds (>30% features), route all cases to Human Review
    if is_drift_fallback_active():
        return "Human Review"

    # Step 1: Explicit, isolated safety override evaluated FIRST
    is_overridden, capped_score, override_decision = evaluate_safety_override(
        electricity_regularity, utility_consistency, alternative_credit_score
    )
    if is_overridden:
        return override_decision
        
    # Step 2: Verification confidence rule (majority self-reported forces Human Review)
    if majority_self_reported:
        return "Human Review"
        
    # Step 3: Data completeness check (insufficient data routes to Human Review)
    if float(data_completeness_pct) < 50.0:
        return "Human Review"
    
    # Step 4: Model uncertainty or fairness flags
    if score_flags.get("both_signals_missing"):
        return "Human Review"
    
    if uncertain or fairness_flag:
        return "Human Review"
    
    # Step 5: Score band routing
    if alternative_credit_score >= 80:
        return "Approve"
    elif alternative_credit_score >= 60:
        return "Approve"
    elif alternative_credit_score >= 40:
        return "Human Review"
    else:
        if uncertain:
            return "Human Review"
        return "Reject"

def get_risk_band(alternative_credit_score):
    if alternative_credit_score >= 80:
        return "Low Risk"
    elif alternative_credit_score >= 60:
        return "Moderate Risk"
    else:
        return "High Risk"

