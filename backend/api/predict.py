# backend/api/predict.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import uuid
import datetime
import os

from db.session import get_db
from db.models import LoanApplication
from pipeline.behavioral_signals import normalize_behavioral_signals, compute_data_completeness
from pipeline.features import compute_engineered_features
from pipeline.alt_credit_score import compute_alternative_credit_score
from pipeline.preprocess import preprocess_for_decision
from pipeline.decision_models import run_decision_models
from pipeline.explainer import explain_decision
from pipeline.fairness import audit_fairness
from pipeline.counterfactual import get_improvement_suggestions
from pipeline.decision_engine import route_decision, get_risk_band
from pipeline.verification import tag_verification_sources
from pipeline.business_rules import validate_business_rules
from pipeline.compliance import (
    generate_key_fact_statement,
    create_dpdp_consent_record,
    GRIEVANCE_OFFICER_ID,
    GRIEVANCE_OFFICER_NAME,
    GRIEVANCE_OFFICER_EMAIL,
    GRIEVANCE_SLA_DAYS
)
from monitoring.drift_fallback import get_drift_fallback_status, set_drift_override_mode, is_drift_fallback_active
from monitoring.disagreement_collector import compute_officer_override_metrics, collect_and_export_disagreements

router = APIRouter()

class LoanApplicationInput(BaseModel):
    # Demographics
    full_name: Optional[str] = None
    gender: str
    age: int
    marital_status: str
    education: str

    # Household & Income
    applicant_income: float
    coapplicant_income: float = 0.0
    dependents: int = 0
    employment_type: str
    area_type: str

    # Loan Details
    loan_amount: float
    loan_term: int
    loan_purpose: str

    # Behavioral Signals
    electricity_bill_avg: Optional[float] = None
    electricity_payment_regularity: Optional[float] = None
    mobile_recharge_amount: Optional[float] = None
    mobile_recharge_frequency: Optional[float] = None
    utility_payment_consistency: Optional[float] = None
    govt_socioeconomic_category: Optional[str] = None

    # Credit History
    credit_score_category: str = "None"
    prior_repayment_record: Optional[float] = None

    # Consent & Verification
    verification_mode: Optional[str] = "self_reported"  # 'aa_uli' or 'self_reported'

    # Tracking
    data_sources_used: Optional[dict] = None

class PredictResponse(BaseModel):
    application_id: str
    behavior_repayment_score: float
    income_affordability_score: float
    alternative_credit_score: float
    risk_band: str
    ai_decision: str
    combined_score: float
    approval_probability: float
    uncertain: bool
    scoring_mode: str
    model_a_label: str
    model_b_scoring_mode: str
    income_affordability_label: str
    accuracy_disclaimer: str
    data_completeness_pct: float
    income_verification_source: str
    majority_self_reported: bool
    verification_sources: dict
    top_reason_1: str
    top_reason_2: str
    shap_values: dict
    suggestions: List[str]
    fairness_flag: bool
    fairness_detail: Optional[str] = None
    debt_to_income: float
    household_burden: float
    employment_stability: float
    data_sources_used: dict
    kfs: Optional[dict] = None
    cooling_off_expiry: Optional[str] = None
    dpdp_consent: Optional[dict] = None
    grievance_officer: Optional[dict] = None
    appeal_status: Optional[str] = None

@router.post("/predict", response_model=PredictResponse)
async def predict_loan(input_data: LoanApplicationInput, db: Session = Depends(get_db)):
    try:
        raw_dict = input_data.model_dump()
        app_id = str(uuid.uuid4())
        
        # 0. Business-Rule Validation — runs BEFORE any feature engineering or ML
        rule_violations = validate_business_rules(raw_dict)
        if rule_violations:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=422,
                content={
                    "detail": "Validation failed",
                    "errors": rule_violations,
                },
            )
        
        print(f"[PREDICT] Received application: {app_id}")
        print(f"[PREDICT] Input data: {raw_dict}")
        
        # 1. Normalize Behavioral Signals & Compute Data Completeness
        norm_data = normalize_behavioral_signals(raw_dict)
        data_completeness = compute_data_completeness(raw_dict)
        
        # 2. Tag Verification Sources (AA / ULI / Self-Reported)
        verification = tag_verification_sources(raw_dict)
        
        # 3. Compute Engineered Proxy Features
        engineered = compute_engineered_features(raw_dict)
        
        # 4. Alternative Credit Score Computation (Model A + Model B Composite)
        acs_results = compute_alternative_credit_score(raw_dict, norm_data, engineered, verification)
        
        # 4. Pre-process for Decision Models (returns dict with 'lr', 'xgb', 'xgb_raw' keys)
        X_dict = preprocess_for_decision(raw_dict, norm_data, engineered, acs_results)
        
        # 5. Run Decision Models (LR uses OHE path, XGB uses label-encoded path)
        decision_results = run_decision_models(X_dict)
        
        # 6. Multi-Model SHAP Explanations (Decision Stage TreeExplainer, Model A TreeExplainer, Model B Surrogate)
        explanation = explain_decision(X_dict, raw_dict, norm_data, engineered)
        
        # 7. Fairness Audit
        fairness = audit_fairness(raw_dict, acs_results["alternative_credit_score"])
        
        # 8. Counterfactual Suggestions
        suggestions = get_improvement_suggestions(raw_dict, engineered, acs_results)
        
        # 10. Final Routing with explicit safety override, completeness & verification checks
        ai_decision = route_decision(
            acs_results["alternative_credit_score"],
            decision_results["combined_score"],
            decision_results["uncertain"],
            fairness["fairness_flag"],
            acs_results["score_flags"],
            electricity_regularity=raw_dict.get("electricity_payment_regularity"),
            utility_consistency=raw_dict.get("utility_payment_consistency"),
            data_completeness_pct=data_completeness,
            majority_self_reported=verification["majority_self_reported"]
        )
        
        risk_band = get_risk_band(acs_results["alternative_credit_score"])
        
        # 11. Regulatory Compliance (KFS for Approvals, DPDP Consent & Grievance Redressal)
        dpdp_record = create_dpdp_consent_record(
            app_id,
            raw_dict.get("full_name") or f"Applicant {app_id[:8]}"
        )
        
        kfs_record = None
        cooling_off_dt = None
        if ai_decision == "Approve":
            kfs_record = generate_key_fact_statement(
                loan_amount=raw_dict.get("loan_amount", 50000.0),
                loan_term_months=raw_dict.get("loan_term", 12),
                borrower_name=raw_dict.get("full_name")
            )
            cooling_off_dt = datetime.datetime.fromisoformat(kfs_record["cooling_off_period"]["expiry_timestamp"])
            
        grievance_info = {
            "officer_id": GRIEVANCE_OFFICER_ID,
            "officer_name": GRIEVANCE_OFFICER_NAME,
            "officer_email": GRIEVANCE_OFFICER_EMAIL,
            "resolution_sla_days": GRIEVANCE_SLA_DAYS
        }
        
        # 12. Persist to Database
        print(f"[PREDICT] SKIP_DB_PERSISTENCE = {os.getenv('SKIP_DB_PERSISTENCE', 'false')}")
        if os.getenv("SKIP_DB_PERSISTENCE", "false").lower() != "true":
            try:
                db_app = LoanApplication(
                    id=app_id,
                    full_name=raw_dict.get("full_name"),
                    gender=raw_dict.get("gender"),
                    age=raw_dict.get("age"),
                    marital_status=raw_dict.get("marital_status"),
                    education=raw_dict.get("education"),
                    applicant_income=raw_dict.get("applicant_income", 0.0),
                    coapplicant_income=raw_dict.get("coapplicant_income", 0.0),
                    loan_amount=raw_dict.get("loan_amount", 0.0),
                    loan_term=raw_dict.get("loan_term", 0),
                    loan_purpose=raw_dict.get("loan_purpose"),
                    dependents=raw_dict.get("dependents", 0),
                    area_type=raw_dict.get("area_type"),
                    employment_type=raw_dict.get("employment_type"),
                    electricity_bill_avg=raw_dict.get("electricity_bill_avg"),
                    electricity_payment_regularity=raw_dict.get("electricity_payment_regularity"),
                    mobile_recharge_amount=raw_dict.get("mobile_recharge_amount"),
                    mobile_recharge_frequency=raw_dict.get("mobile_recharge_frequency"),
                    utility_payment_consistency=raw_dict.get("utility_payment_consistency"),
                    prior_repayment_record=raw_dict.get("prior_repayment_record"),
                    govt_socioeconomic_category=raw_dict.get("govt_socioeconomic_category"),
                    credit_score_category=raw_dict.get("credit_score_category", "None"),
                    debt_to_income=engineered.get("debt_to_income", 0.0),
                    household_burden=engineered.get("household_burden", 0.0),
                    employment_stability=engineered.get("employment_stability", 0.0),
                    behavior_repayment_score=acs_results["behavior_repayment_score"],
                    income_affordability_score=acs_results["income_affordability_score"],
                    alternative_credit_score=acs_results["alternative_credit_score"],
                    risk_band=risk_band,
                    scoring_mode=acs_results["scoring_mode"],
                    model_b_label=acs_results["income_affordability_label"],
                    data_completeness_pct=data_completeness,
                    income_verification_source=verification["income_verification_source"],
                    verification_sources_json=verification["sources"],
                    majority_self_reported=verification["majority_self_reported"],
                    lr_score=decision_results["lr_score"],
                    xgb_score=decision_results["xgb_score"],
                    combined_score=decision_results["combined_score"],
                    ai_decision=ai_decision,
                    shap_values_json=explanation["shap_values"],
                    top_reason_1=explanation["top_reason_1"],
                    top_reason_2=explanation["top_reason_2"],
                    suggestions_json=suggestions,
                    fairness_flag=fairness["fairness_flag"],
                    fairness_detail=fairness["fairness_detail"],
                    data_sources_used=raw_dict.get("data_sources_used", {}),
                    kfs_json=kfs_record,
                    cooling_off_expiry=cooling_off_dt,
                    grievance_officer_id=GRIEVANCE_OFFICER_ID,
                    grievance_officer_name=GRIEVANCE_OFFICER_NAME,
                    grievance_officer_email=GRIEVANCE_OFFICER_EMAIL,
                    grievance_sla_days=GRIEVANCE_SLA_DAYS,
                    dpdp_consent_id=dpdp_record["dpdp_consent_id"],
                    appeal_status=None
                )
                db.add(db_app)
                db.commit()
                print(f"[PREDICT] Application {app_id} saved to database successfully")
            except Exception as db_err:
                print(f"[DATABASE ERROR] Failed to save application {app_id}: {str(db_err)}")
                db.rollback()
        
        # 11. Final Response
        return PredictResponse(
            application_id=app_id,
            behavior_repayment_score=acs_results["behavior_repayment_score"],
            income_affordability_score=acs_results["income_affordability_score"],
            alternative_credit_score=acs_results["alternative_credit_score"],
            risk_band=risk_band,
            ai_decision=ai_decision,
            combined_score=decision_results["combined_score"],
            approval_probability=decision_results["approval_probability"],
            uncertain=decision_results["uncertain"],
            scoring_mode=acs_results["scoring_mode"],
            model_a_label=acs_results["model_a_label"],
            model_b_scoring_mode=acs_results["model_b_scoring_mode"],
            income_affordability_label=acs_results["income_affordability_label"],
            accuracy_disclaimer=acs_results["accuracy_disclaimer"],
            data_completeness_pct=data_completeness,
            income_verification_source=verification["income_verification_source"],
            majority_self_reported=verification["majority_self_reported"],
            verification_sources=verification["sources"],
            top_reason_1=explanation["top_reason_1"],
            top_reason_2=explanation["top_reason_2"],
            shap_values=explanation["shap_values"],
            suggestions=suggestions,
            fairness_flag=fairness["fairness_flag"],
            fairness_detail=fairness["fairness_detail"],
            debt_to_income=engineered["debt_to_income"],
            household_burden=engineered["household_burden"],
            employment_stability=engineered["employment_stability"],
            data_sources_used=raw_dict.get("data_sources_used") or {},
            kfs=kfs_record,
            cooling_off_expiry=cooling_off_dt.isoformat() if cooling_off_dt else None,
            dpdp_consent=dpdp_record,
            grievance_officer=grievance_info,
            appeal_status=None
        )
        
    except Exception as e:
        print(f"[PREDICT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


# ============= NEW ENDPOINTS FOR RETRIEVING DATA =============

@router.get("/applications")
async def get_applications(db: Session = Depends(get_db)):
    """Retrieve all loan applications from database"""
    try:
        applications = db.query(LoanApplication).order_by(LoanApplication.created_at.desc()).all()
        
        # Format response
        result = []
        for app in applications:
            result.append({
                "application_id": app.id,
                "applicant_name": app.full_name or f"Applicant {app.id[:8]}",
                "age": app.age,
                "gender": app.gender,
                "employment_type": app.employment_type,
                "area_type": app.area_type,
                "loan_amount": app.loan_amount,
                "loan_term": app.loan_term,
                "alternative_credit_score": app.alternative_credit_score,
                "risk_band": app.risk_band,
                "decision": app.ai_decision,
                "date": app.created_at.isoformat().split('T')[0],
                "officer_id": app.officer_id or "SYSTEM",
                "officer_name": app.officer_id or "Automated System",
                "behavior_repayment_score": app.behavior_repayment_score,
                "income_affordability_score": app.income_affordability_score,
                "combined_score": app.combined_score,
                "approval_probability": app.lr_score,
                "fairness_flag": app.fairness_flag,
                "scoring_mode": app.scoring_mode or "trained_model",
                "income_affordability_label": app.model_b_label or "estimated, not verified",
                "data_completeness_pct": app.data_completeness_pct if app.data_completeness_pct is not None else 100.0,
                "top_reason_1": app.top_reason_1,
                "top_reason_2": app.top_reason_2,
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


@router.get("/applications/{application_id}")
async def get_application(application_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific loan application"""
    try:
        app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
        
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "application_id": app.id,
            "applicant_name": app.full_name or f"Applicant {app.id[:8]}",
            "age": app.age,
            "gender": app.gender,
            "marital_status": app.marital_status,
            "education": app.education,
            "employment_type": app.employment_type,
            "area_type": app.area_type,
            "applicant_income": app.applicant_income,
            "coapplicant_income": app.coapplicant_income,
            "dependents": app.dependents,
            "loan_amount": app.loan_amount,
            "loan_term": app.loan_term,
            "loan_purpose": app.loan_purpose,
            "alternative_credit_score": app.alternative_credit_score,
            "risk_band": app.risk_band,
            "decision": app.ai_decision,
            "date": app.created_at.isoformat().split('T')[0],
            "scoring_mode": app.scoring_mode or "trained_model",
            "model_a_label": "Trained XGBoost Classifier (demo-stage, proxy data)" if (app.scoring_mode or "trained_model") == "trained_model" else "Rule-Based Scorecard (Fallback)",
            "model_b_scoring_mode": "unsupervised_composite_index",
            "income_affordability_label": app.model_b_label or "estimated, not verified",
            "accuracy_disclaimer": "demo-stage, proxy data",
            "data_completeness_pct": app.data_completeness_pct if app.data_completeness_pct is not None else 100.0,
            "behavior_repayment_score": app.behavior_repayment_score,
            "income_affordability_score": app.income_affordability_score,
            "combined_score": app.combined_score,
            "approval_probability": app.lr_score,
            "fairness_flag": app.fairness_flag,
            "fairness_detail": app.fairness_detail,
            "top_reason_1": app.top_reason_1,
            "top_reason_2": app.top_reason_2,
            "suggestions": app.suggestions_json or [],
            "shap_top_features": app.shap_values_json or {},
            "electricity_bill_avg": app.electricity_bill_avg,
            "electricity_payment_regularity": app.electricity_payment_regularity,
            "mobile_recharge_amount": app.mobile_recharge_amount,
            "mobile_recharge_frequency": app.mobile_recharge_frequency,
            "utility_payment_consistency": app.utility_payment_consistency,
            "prior_repayment_record": app.prior_repayment_record,
            "govt_socioeconomic_category": app.govt_socioeconomic_category,
            "credit_score_category": app.credit_score_category,
            "debt_to_income": app.debt_to_income,
            "household_burden": app.household_burden,
            "employment_stability": app.employment_stability,
            "data_sources_used": app.data_sources_used or {},
            "officer_decision": app.officer_decision,
            "officer_id": app.officer_id,
            "kfs": app.kfs_json,
            "cooling_off_expiry": app.cooling_off_expiry.isoformat() if app.cooling_off_expiry else None,
            "grievance_officer": {
                "id": app.grievance_officer_id or GRIEVANCE_OFFICER_ID,
                "name": app.grievance_officer_name or GRIEVANCE_OFFICER_NAME,
                "email": app.grievance_officer_email or GRIEVANCE_OFFICER_EMAIL,
                "sla_days": app.grievance_sla_days or GRIEVANCE_SLA_DAYS
            },
            "dpdp_consent_id": app.dpdp_consent_id,
            "appeal_status": app.appeal_status,
            "appeal_reason": app.appeal_reason,
            "appeal_response": app.appeal_response_json,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch application: {str(e)}")


from pipeline.fairness import audit_fairness, compute_rolling_fairness_audit

@router.get("/fairness/audit")
async def get_fairness_audit(trailing_days: int = 30):
    """Retrieve rolling multi-axis demographic fairness audit with sample-size floor"""
    try:
        audit_data = compute_rolling_fairness_audit(trailing_days=trailing_days)
        return audit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute fairness audit: {str(e)}")


@router.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Retrieve dashboard statistics"""
    try:
        applications = db.query(LoanApplication).all()
        
        # Calculate multi-axis fairness audit
        fairness_audit_data = compute_rolling_fairness_audit(trailing_days=30)
        
        # Calculate officer override metrics
        override_metrics = compute_officer_override_metrics(db)
        
        # Get drift fallback status
        drift_status = get_drift_fallback_status()
        
        total = len(applications)
        if total == 0:
            return {
                "total": 0,
                "approved": 0,
                "approved_pct": "0.0",
                "human_review": 0,
                "human_review_pct": "0.0",
                "rejected": 0,
                "rejected_pct": "0.0",
                "avg_score": 0,
                "fairness_flags": 0,
                "approval_rate": "0.0",
                "drift_detected": drift_status.get("drift_detected", False),
                "drift_fallback_active": drift_status.get("fallback_active", False),
                "drift_status": drift_status,
                "override_rate_pct": override_metrics.get("override_rate_pct", "0.0"),
                "override_count": override_metrics.get("override_count", 0),
                "officer_override_metrics": override_metrics,
                "score_distribution": [],
                "decision_breakdown": [],
                "trend_data": [],
                "fairness_audit": fairness_audit_data,
            }
        
        # Calculate stats
        approved = len([a for a in applications if a.ai_decision == "Approve"])
        human_review = len([a for a in applications if a.ai_decision == "Human Review"])
        rejected = len([a for a in applications if a.ai_decision == "Reject"])
        avg_score = sum(a.alternative_credit_score for a in applications) / total
        fairness_flags = len([a for a in applications if a.fairness_flag])
        
        # Score distribution
        score_ranges = [
            (0, 39, "High Risk"),
            (40, 59, "Moderate Risk"),
            (60, 79, "Moderate Risk"),
            (80, 100, "Low Risk"),
        ]
        score_dist = []
        for low, high, band in score_ranges:
            count = len([a for a in applications if low <= a.alternative_credit_score <= high])
            score_dist.append({"range": f"{low}-{high}", "count": count, "band": band})
        
        return {
            "total": total,
            "approved": approved,
            "approved_pct": f"{(approved/total*100):.1f}",
            "human_review": human_review,
            "human_review_pct": f"{(human_review/total*100):.1f}",
            "rejected": rejected,
            "rejected_pct": f"{(rejected/total*100):.1f}",
            "avg_score": round(avg_score, 2),
            "fairness_flags": fairness_flags,
            "approval_rate": f"{(approved/total*100):.1f}",
            "drift_detected": drift_status.get("drift_detected", False),
            "drift_fallback_active": drift_status.get("fallback_active", False),
            "drift_status": drift_status,
            "override_rate_pct": override_metrics.get("override_rate_pct", "0.0"),
            "override_count": override_metrics.get("override_count", 0),
            "officer_override_metrics": override_metrics,
            "score_distribution": score_dist,
            "decision_breakdown": [
                {"name": "Approved", "value": approved, "color": "#10B981"},
                {"name": "Human Review", "value": human_review, "color": "#F59E0B"},
                {"name": "Rejected", "value": rejected, "color": "#EF4444"},
            ],
            "fairness_audit": fairness_audit_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


class DecisionOverrideInput(BaseModel):
    application_id: str
    officer_decision: str
    officer_id: str
    notes: Optional[str] = None


@router.post("/decision/override")
async def override_decision(override_data: DecisionOverrideInput, db: Session = Depends(get_db)):
    """Override AI decision with human decision"""
    try:
        app = db.query(LoanApplication).filter(LoanApplication.id == override_data.application_id).first()
        
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app.officer_decision = override_data.officer_decision
        app.officer_id = override_data.officer_id
        
        db.commit()
        
        return {"success": True, "message": "Decision overridden successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to override decision: {str(e)}")


class DriftToggleInput(BaseModel):
    active: bool
    reason: Optional[str] = None


@router.post("/monitoring/drift-fallback/toggle")
async def toggle_drift_fallback(input_data: DriftToggleInput):
    """Manually or programmatically activate/deactivate drift fallback mode"""
    try:
        new_state = set_drift_override_mode(
            active=input_data.active,
            reason=input_data.reason or ("Manual toggle by administrator" if input_data.active else "Manual reset by administrator")
        )
        return {
            "success": True,
            "message": f"Drift fallback mode {'ACTIVATED' if input_data.active else 'DEACTIVATED'}",
            "state": new_state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle drift fallback: {str(e)}")


@router.get("/monitoring/drift-fallback/status")
async def get_drift_status_endpoint():
    """Retrieve current persistent drift fallback state"""
    try:
        return get_drift_fallback_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch drift status: {str(e)}")


@router.post("/monitoring/collect-disagreements")
async def trigger_disagreement_collection(db: Session = Depends(get_db)):
    """Pulls officer disagreement cases into a labeled dataset for the next training cycle"""
    try:
        result = collect_and_export_disagreements(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to collect disagreements: {str(e)}")

