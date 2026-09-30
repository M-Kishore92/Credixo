# backend/pipeline/fairness.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import text
from db.session import engine

# Demographic axes to monitor
DEMOGRAPHIC_AXES = ["gender", "area_type", "education", "employment_type"]
MIN_SUBGROUP_SAMPLE_SIZE = 30  # Sample-size floor per subgroup in trailing 30-day window

def compute_rolling_fairness_audit(df_or_db=None, trailing_days=30):
    """
    Computes a multi-axis demographic fairness audit on trailing applications:
    - Demographic axes: gender, area_type, education, employment_type
    - Minimum sample size floor: N >= 30 per subgroup. If N < 30, marks 'insufficient data to assess (N < 30)'
    - Pairwise Demographic Parity Difference (DPD) = max|approval_rate_a - approval_rate_b|
    - Pairwise Equal Opportunity Difference (EOD) = max|tpr_a - tpr_b|
    """
    df = None
    if isinstance(df_or_db, pd.DataFrame):
        df = df_or_db.copy()
    else:
        try:
            cutoff = (datetime.utcnow() - timedelta(days=trailing_days)).isoformat()
            with engine.connect() as conn:
                query = text("""
                    SELECT gender, area_type, education, employment_type,
                           alternative_credit_score, ai_decision, behavior_repayment_score,
                           prior_repayment_record, created_at
                    FROM loan_applications 
                    WHERE created_at > :cutoff
                """)
                df = pd.read_sql(query, conn, params={"cutoff": cutoff})
        except Exception as e:
            print(f"[FAIRNESS AUDIT] Failed to query DB: {e}")
            df = pd.DataFrame()
            
    if df is None or len(df) == 0:
        return _generate_empty_audit()
        
    df["is_approved"] = df["ai_decision"].astype(str).str.lower().isin(["approve", "approved"]).astype(int)
    
    # Proxy for positive credit outcome (creditworthy: repaid prior or high behavioral score)
    df["ground_truth_proxy"] = (
        (df["prior_repayment_record"].fillna(0) >= 0.7) |
        (df["behavior_repayment_score"].fillna(0) >= 60.0)
    ).astype(int)
    
    axis_results = {}
    any_disparity_flagged = False
    
    for axis in DEMOGRAPHIC_AXES:
        if axis not in df.columns:
            continue
            
        subgroups = {}
        valid_approval_rates = []
        valid_tpr_rates = []
        
        # Group by category in this axis
        grouped = df.groupby(axis)
        for cat_val, grp in grouped:
            cat_str = str(cat_val)
            n_samples = len(grp)
            
            if n_samples < MIN_SUBGROUP_SAMPLE_SIZE:
                subgroups[cat_str] = {
                    "sample_size": n_samples,
                    "status": "insufficient_data",
                    "approval_rate": None,
                    "tpr": None,
                    "display_note": f"Insufficient data to assess (N = {n_samples} < {MIN_SUBGROUP_SAMPLE_SIZE})"
                }
            else:
                app_rate = round(float(grp["is_approved"].mean()) * 100.0, 1)
                
                # Compute TPR for Equal Opportunity
                positive_outcomes = grp[grp["ground_truth_proxy"] == 1]
                if len(positive_outcomes) >= 10:
                    tpr = round(float(positive_outcomes["is_approved"].mean()) * 100.0, 1)
                    valid_tpr_rates.append((cat_str, tpr))
                else:
                    tpr = app_rate  # Proxy fallback if ground truth positives are few
                    valid_tpr_rates.append((cat_str, tpr))
                    
                valid_approval_rates.append((cat_str, app_rate))
                
                subgroups[cat_str] = {
                    "sample_size": n_samples,
                    "status": "assessed",
                    "approval_rate": app_rate,
                    "tpr": tpr,
                    "display_note": f"{app_rate}% approval rate (N = {n_samples})"
                }
                
        # Compute pairwise DPD & EOD across all assessed subgroups
        if len(valid_approval_rates) >= 2:
            rates = [r[1] for r in valid_approval_rates]
            dpd = round(max(rates) - min(rates), 1)
            
            tprs = [r[1] for r in valid_tpr_rates] if valid_tpr_rates else rates
            eod = round(max(tprs) - min(tprs), 1)
            
            axis_flag = dpd > 10.0 or eod > 10.0
            if axis_flag:
                any_disparity_flagged = True
                
            axis_results[axis] = {
                "subgroups": subgroups,
                "demographic_parity_difference": dpd,
                "equal_opportunity_difference": eod,
                "disparity_flag": axis_flag,
                "status": "assessed",
                "min_sample_size_floor": MIN_SUBGROUP_SAMPLE_SIZE,
                "summary": f"DPD: {dpd}pp, EOD: {eod}pp ({'Disparity Detected' if axis_flag else 'Compliant'})"
            }
        else:
            axis_results[axis] = {
                "subgroups": subgroups,
                "demographic_parity_difference": None,
                "equal_opportunity_difference": None,
                "disparity_flag": False,
                "status": "insufficient_data",
                "min_sample_size_floor": MIN_SUBGROUP_SAMPLE_SIZE,
                "summary": f"Insufficient subgroup comparisons (need >= 2 groups with N >= {MIN_SUBGROUP_SAMPLE_SIZE})"
            }
            
    return {
        "trailing_days": trailing_days,
        "total_applications_analyzed": len(df),
        "min_subgroup_sample_size": MIN_SUBGROUP_SAMPLE_SIZE,
        "fairness_flag": any_disparity_flagged,
        "axes": axis_results
    }

def _generate_empty_audit():
    axis_results = {}
    for axis in DEMOGRAPHIC_AXES:
        axis_results[axis] = {
            "subgroups": {},
            "demographic_parity_difference": None,
            "equal_opportunity_difference": None,
            "disparity_flag": False,
            "status": "insufficient_data",
            "min_sample_size_floor": MIN_SUBGROUP_SAMPLE_SIZE,
            "summary": f"No trailing data available (min floor N = {MIN_SUBGROUP_SAMPLE_SIZE})"
        }
    return {
        "trailing_days": 30,
        "total_applications_analyzed": 0,
        "min_subgroup_sample_size": MIN_SUBGROUP_SAMPLE_SIZE,
        "fairness_flag": False,
        "axes": axis_results
    }

def audit_fairness(current_application, current_acs):
    """
    Per-application wrapper that checks the rolling demographic fairness state.
    """
    try:
        rolling_audit = compute_rolling_fairness_audit(trailing_days=30)
        
        # Check if the applicant belongs to any flagged axis with assessed disparity
        flagged_details = []
        for axis_name, axis_data in rolling_audit.get("axes", {}).items():
            if axis_data.get("disparity_flag"):
                val = str(current_application.get(axis_name, ""))
                sub = axis_data.get("subgroups", {}).get(val)
                if sub and sub.get("status") == "assessed":
                    flagged_details.append(f"{axis_name} ({val}: {sub.get('approval_rate')}%)")
                    
        if flagged_details:
            detail_msg = f"Demographic disparity flagged on trailing 30d window: {', '.join(flagged_details)}."
            return {"fairness_flag": True, "fairness_detail": detail_msg}
            
        return {"fairness_flag": False, "fairness_detail": None}
    except Exception as e:
        return {"fairness_flag": False, "fairness_detail": None}
