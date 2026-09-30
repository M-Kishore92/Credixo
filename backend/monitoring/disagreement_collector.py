# backend/monitoring/disagreement_collector.py
"""
Officer-AI Decision Disagreement Collector & Dashboard Override Metrics.

1. Identifies loan applications where the human loan officer's verdict (officer_decision)
   overruled or contested the machine's verdict (ai_decision).
2. Packages these cases into a labeled disagreement set for active learning / next training cycle.
3. Computes officer override rates, disagreement distributions, and trend metrics for the officer dashboard.
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

DISAGREEMENT_DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "disagreement_training_set.json"
)

def compute_officer_override_metrics(db: Session) -> Dict[str, Any]:
    """
    Computes summary override metrics for the officer dashboard.
    """
    from db.models import LoanApplication
    
    apps = db.query(LoanApplication).all()
    total_apps = len(apps)
    
    if total_apps == 0:
        return {
            "total_applications": 0,
            "total_reviewed": 0,
            "override_count": 0,
            "override_rate_pct": "0.0",
            "approval_overrides": 0,
            "rejection_overrides": 0,
            "agreement_count": 0,
            "recent_disagreements": []
        }
        
    reviewed_apps = [a for a in apps if a.officer_decision and a.officer_decision.strip() != ""]
    total_reviewed = len(reviewed_apps)
    
    # Cases where officer explicitly disagreed with AI decision
    disagreements = [
        a for a in reviewed_apps
        if a.officer_decision.strip().lower() != (a.ai_decision or "").strip().lower()
    ]
    override_count = len(disagreements)
    
    # Calculate override rate relative to reviewed cases (or total if no explicit reviews)
    denominator = total_reviewed if total_reviewed > 0 else total_apps
    override_rate = (override_count / denominator) * 100.0
    
    approval_overrides = len([
        a for a in disagreements
        if a.officer_decision == "Approve" and a.ai_decision in ["Reject", "Human Review"]
    ])
    rejection_overrides = len([
        a for a in disagreements
        if a.officer_decision == "Reject" and a.ai_decision in ["Approve", "Human Review"]
    ])
    agreement_count = total_reviewed - override_count
    
    # Recent disagreement samples
    recent_samples = []
    for a in disagreements[-10:]:
        recent_samples.append({
            "application_id": a.id,
            "applicant_name": a.full_name or f"Applicant {a.id[:8]}",
            "ai_decision": a.ai_decision,
            "officer_decision": a.officer_decision,
            "officer_id": a.officer_id,
            "score": a.alternative_credit_score,
            "top_reasons": [a.top_reason_1, a.top_reason_2],
            "date": a.created_at.isoformat() if a.created_at else None
        })
        
    return {
        "total_applications": total_apps,
        "total_reviewed": total_reviewed,
        "override_count": override_count,
        "override_rate_pct": f"{override_rate:.1f}",
        "approval_overrides": approval_overrides,
        "rejection_overrides": rejection_overrides,
        "agreement_count": agreement_count,
        "recent_disagreements": recent_samples
    }

def collect_and_export_disagreements(db: Session, output_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Scheduled job: Pulls all officer disagreements and saves them as a labeled dataset
    ready for the next training cycle (active learning loop).
    """
    from db.models import LoanApplication
    
    target_path = output_path or DISAGREEMENT_DATASET_PATH
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    apps = db.query(LoanApplication).all()
    disagreements = [
        a for a in apps
        if a.officer_decision and a.officer_decision.strip() != "" and
        a.officer_decision.strip().lower() != (a.ai_decision or "").strip().lower()
    ]
    
    records = []
    for a in disagreements:
        # Construct feature vector for retrain dataset
        record = {
            "application_id": a.id,
            "collected_at": datetime.utcnow().isoformat(),
            "gender": a.gender,
            "age": a.age,
            "marital_status": a.marital_status,
            "education": a.education,
            "applicant_income": a.applicant_income,
            "coapplicant_income": a.coapplicant_income,
            "loan_amount": a.loan_amount,
            "loan_term_months": a.loan_term,
            "loan_purpose": a.loan_purpose,
            "dependents": a.dependents,
            "area_type": a.area_type,
            "employment_type": a.employment_type,
            "electricity_bill_avg": a.electricity_bill_avg,
            "electricity_payment_regularity": a.electricity_payment_regularity,
            "mobile_recharge_avg": a.mobile_recharge_amount,
            "mobile_recharge_frequency": a.mobile_recharge_frequency,
            "utility_payment_consistency": a.utility_payment_consistency,
            "prior_repayment_record": a.prior_repayment_record,
            "alternative_credit_score": a.alternative_credit_score,
            "ai_decision": a.ai_decision,
            "officer_decision": a.officer_decision,
            "officer_id": a.officer_id,
            # Ground truth label for active learning retraining
            "retraining_target_label": 1 if a.officer_decision == "Approve" else 0
        }
        records.append(record)
        
    export_payload = {
        "export_timestamp": datetime.utcnow().isoformat(),
        "total_disagreements": len(records),
        "disagreement_records": records
    }
    
    with open(target_path, "w") as f:
        json.dump(export_payload, f, indent=2)
        
    print(f"[DISAGREEMENT COLLECTOR] Exported {len(records)} disagreement cases to {target_path}")
    return {
        "success": True,
        "collected_count": len(records),
        "file_path": target_path,
        "timestamp": export_payload["export_timestamp"]
    }
