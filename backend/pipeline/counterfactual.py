# backend/pipeline/counterfactual.py
from pipeline.behavioral_signals import normalize_behavioral_signals, compute_data_completeness
from pipeline.features import compute_engineered_features
from pipeline.alt_credit_score import compute_alternative_credit_score
from pipeline.preprocess import preprocess_for_decision
from pipeline.decision_models import run_decision_models
from pipeline.decision_engine import route_decision, get_risk_band
from pipeline.verification import tag_verification_sources

DECISION_RANK = {"Reject": 0, "Human Review": 1, "Approve": 2}
RISK_RANK = {"High Risk": 0, "Moderate Risk": 1, "Low Risk": 2}

def _simulate_pipeline(hypo_raw):
    """
    Re-runs the complete scoring and decision pipeline for a hypothetical input.
    """
    try:
        norm_data = normalize_behavioral_signals(hypo_raw)
        completeness = compute_data_completeness(hypo_raw)
        verification = tag_verification_sources(hypo_raw)
        engineered = compute_engineered_features(hypo_raw)
        acs_results = compute_alternative_credit_score(hypo_raw, norm_data, engineered, verification)
        
        try:
            X_scaled, _ = preprocess_for_decision(hypo_raw, norm_data, engineered, acs_results)
            decision_results = run_decision_models(X_scaled)
        except Exception:
            decision_results = {"combined_score": acs_results["alternative_credit_score"] / 100.0, "uncertain": False}
            
        decision = route_decision(
            acs_results["alternative_credit_score"],
            decision_results.get("combined_score", 0.5),
            decision_results.get("uncertain", False),
            fairness_flag=False,
            score_flags=acs_results["score_flags"],
            electricity_regularity=hypo_raw.get("electricity_payment_regularity"),
            utility_consistency=hypo_raw.get("utility_payment_consistency"),
            data_completeness_pct=completeness,
            majority_self_reported=verification.get("majority_self_reported", False)
        )
        risk_band = get_risk_band(acs_results["alternative_credit_score"])
        
        return {
            "alternative_credit_score": acs_results["alternative_credit_score"],
            "decision": decision,
            "risk_band": risk_band,
            "behavior_score": acs_results["behavior_repayment_score"],
            "income_score": acs_results["income_affordability_score"]
        }
    except Exception as e:
        return None

def get_improvement_suggestions(raw_data, engineered_features, acs_results, **kwargs):
    """
    Generates counterfactual suggestions verified by re-running the full scoring pipeline.
    Each candidate suggestion is confirmed to measurably improve score, risk band, or decision
    before being surfaced.
    """
    base_acs = float(acs_results.get("alternative_credit_score", 50.0))
    base_risk_band = get_risk_band(base_acs)
    base_decision = kwargs.get("ai_decision") or "Human Review"
    
    # Check baseline pipeline result if not passed explicitly
    base_sim = _simulate_pipeline(raw_data)
    if base_sim:
        base_acs = base_sim["alternative_credit_score"]
        base_decision = base_sim["decision"]
        base_risk_band = base_sim["risk_band"]
        
    suggestions = []
    validated_candidates = []
    
    loan_amt = float(raw_data.get("loan_amount") or 0.0)
    app_inc = float(raw_data.get("applicant_income") or 0.0)
    coapp_inc = float(raw_data.get("coapplicant_income") or 0.0)
    emp_type = raw_data.get("employment_type", "Salaried")
    dti = float(engineered_features.get("debt_to_income", 0.0))
    
    # -------------------------------------------------------------
    # 1. Candidate: Reduce Loan Amount
    # -------------------------------------------------------------
    if loan_amt > 20000 and (dti > 0.30 or base_acs < 80):
        reduction_amt = min(loan_amt * 0.35, max(10000.0, loan_amt - app_inc * 6))
        reduction_amt = round(reduction_amt / 5000) * 5000
        if reduction_amt >= 5000 and reduction_amt < loan_amt:
            hypo = dict(raw_data)
            hypo["loan_amount"] = loan_amt - reduction_amt
            res = _simulate_pipeline(hypo)
            if res:
                score_gain = res["alternative_credit_score"] - base_acs
                decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
                risk_gain = RISK_RANK.get(res["risk_band"], 0) > RISK_RANK.get(base_risk_band, 0)
                
                if decision_gain or risk_gain or score_gain >= 3.0:
                    validated_candidates.append({
                        "res": res,
                        "priority": 10 if decision_gain else (8 if risk_gain else 5),
                        "text": f"Reducing the loan amount by ₹{int(reduction_amt):,} lowers debt-to-income burden, raising your score to {res['alternative_credit_score']} ({res['risk_band']})."
                    })
                    
    # -------------------------------------------------------------
    # 2. Candidate: Add a Co-applicant (Feasibility Filtered)
    # -------------------------------------------------------------
    if coapp_inc == 0 and emp_type in ["Daily wage", "Farmer", "Self-employed"]:
        hypo = dict(raw_data)
        hypo["coapplicant_income"] = max(10000.0, round(app_inc * 0.6 / 1000) * 1000)
        res = _simulate_pipeline(hypo)
        if res:
            score_gain = res["alternative_credit_score"] - base_acs
            decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
            risk_gain = RISK_RANK.get(res["risk_band"], 0) > RISK_RANK.get(base_risk_band, 0)
            
            if decision_gain or risk_gain or score_gain >= 3.0:
                validated_candidates.append({
                    "res": res,
                    "priority": 9 if decision_gain else 7,
                    "text": f"Adding a co-applicant with ~₹{int(hypo['coapplicant_income']):,}/mo income strengthens household affordability, lifting your score to {res['alternative_credit_score']}."
                })
                
    # -------------------------------------------------------------
    # 3. Candidate: Consistent Utility / Electricity Regularity
    # -------------------------------------------------------------
    elec_reg = raw_data.get("electricity_payment_regularity")
    if elec_reg is not None and float(elec_reg) < 0.85:
        hypo = dict(raw_data)
        hypo["electricity_payment_regularity"] = 0.95
        hypo["utility_payment_consistency"] = 0.95
        res = _simulate_pipeline(hypo)
        if res:
            score_gain = res["alternative_credit_score"] - base_acs
            decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
            risk_gain = RISK_RANK.get(res["risk_band"], 0) > RISK_RANK.get(base_risk_band, 0)
            
            if decision_gain or risk_gain or score_gain >= 3.0:
                validated_candidates.append({
                    "res": res,
                    "priority": 8 if decision_gain else 6,
                    "text": f"Maintaining on-time utility & electricity payments for 3 consecutive months raises your behavioral score to {res['alternative_credit_score']}."
                })
                
    # -------------------------------------------------------------
    # 4. Candidate: Digital AA/ULI Verification (if currently self-reported)
    # -------------------------------------------------------------
    if raw_data.get("verification_mode") != "aa_uli":
        hypo = dict(raw_data)
        hypo["verification_mode"] = "aa_uli"
        res = _simulate_pipeline(hypo)
        if res:
            score_gain = res["alternative_credit_score"] - base_acs
            decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
            risk_gain = RISK_RANK.get(res["risk_band"], 0) > RISK_RANK.get(base_risk_band, 0)
            
            if decision_gain or risk_gain or score_gain >= 2.0:
                validated_candidates.append({
                    "res": res,
                    "priority": 11 if decision_gain else 7,
                    "text": f"Connecting digital records via AA/ULI removes self-report confidence penalties, fast-tracking your application ({res['decision']})."
                })
                
    # -------------------------------------------------------------
    # 5. Candidate: Extend Loan Tenure (if high EMI burden)
    # -------------------------------------------------------------
    loan_term = int(raw_data.get("loan_term") or raw_data.get("loan_term_months") or 12)
    if loan_term <= 24 and dti > 0.35:
        hypo = dict(raw_data)
        hypo["loan_term"] = loan_term + 12
        hypo["loan_term_months"] = loan_term + 12
        res = _simulate_pipeline(hypo)
        if res:
            score_gain = res["alternative_credit_score"] - base_acs
            decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
            risk_gain = RISK_RANK.get(res["risk_band"], 0) > RISK_RANK.get(base_risk_band, 0)
            
            if decision_gain or risk_gain or score_gain >= 3.0:
                validated_candidates.append({
                    "res": res,
                    "priority": 6,
                    "text": f"Extending repayment tenure from {loan_term} to {loan_term + 12} months lowers monthly EMI, improving affordability to {res['alternative_credit_score']}."
                })
                
    # -------------------------------------------------------------
    # 6. Candidate: Farmer specific (Harvest Season Declared Income)
    # -------------------------------------------------------------
    if emp_type == "Farmer":
        hypo = dict(raw_data)
        hypo["applicant_income"] = app_inc * 1.35
        res = _simulate_pipeline(hypo)
        if res:
            score_gain = res["alternative_credit_score"] - base_acs
            decision_gain = DECISION_RANK.get(res["decision"], 0) > DECISION_RANK.get(base_decision, 0)
            if decision_gain or score_gain >= 3.0:
                validated_candidates.append({
                    "res": res,
                    "priority": 5,
                    "text": f"Applying post-harvest when declared agricultural cash flow is higher boosts verified capacity to {res['alternative_credit_score']}."
                })

    # Sort validated suggestions by impact priority
    validated_candidates.sort(key=lambda c: c["priority"], reverse=True)
    
    for c in validated_candidates:
        if c["text"] not in suggestions:
            suggestions.append(c["text"])
            
    # If first-time borrower and fewer than 3 suggestions, add informational advice
    if raw_data.get("prior_repayment_record") is None and len(suggestions) < 3:
        suggestions.append(
            "This is a first-time loan application. Repaying on time establishes your track record and unlocks higher credit tiers."
        )
        
    return suggestions[:3]
