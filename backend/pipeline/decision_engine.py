# backend/pipeline/decision_engine.py

def route_decision(alternative_credit_score, combined_score, uncertain, fairness_flag, score_flags):
    """
    Final routing logic to assemble the global decision.
    """
    # 1. Override conditions (High Risk / Low Confidence)
    if score_flags.get("both_signals_missing"):
        return "Human Review"
    
    if uncertain or fairness_flag:
        return "Human Review"
    
    # 2. Score band routing
    if alternative_credit_score >= 80:
        return "Approve"
    elif alternative_credit_score >= 60:
        # "Approve" (frontend will show specialized UI for this tier)
        return "Approve"
    elif alternative_credit_score >= 40:
        return "Human Review"
    else:
        # Even if score is low, if models are very uncertain, route to Human
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
