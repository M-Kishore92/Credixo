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
from pipeline.behavioral_signals import normalize_behavioral_signals
from pipeline.features import compute_engineered_features
from pipeline.alt_credit_score import compute_alternative_credit_score
from pipeline.preprocess import preprocess_for_decision
from pipeline.decision_models import run_decision_models
from pipeline.explainer import explain_decision
from pipeline.fairness import audit_fairness
from pipeline.counterfactual import get_improvement_suggestions
from pipeline.decision_engine import route_decision, get_risk_band

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

@router.post("/predict", response_model=PredictResponse)
async def predict_loan(input_data: LoanApplicationInput, db: Session = Depends(get_db)):
    try:
        raw_dict = input_data.model_dump()
        app_id = str(uuid.uuid4())
        
        print(f"[PREDICT] Received application: {app_id}")
        print(f"[PREDICT] Input data: {raw_dict}")
        
        # 1. Normalize Behavioral Signals
        norm_data = normalize_behavioral_signals(raw_dict)
        
        # 2. Compute Engineered Proxy Features
        engineered = compute_engineered_features(raw_dict)
        
        # 3. Alternative Credit Score Computation
        acs_results = compute_alternative_credit_score(raw_dict, norm_data, engineered)
        
        # 4. Pre-process for Decision Models
        X_scaled, X_raw = preprocess_for_decision(raw_dict, norm_data, engineered, acs_results)
        
        # 5. Run Decision Models (LR + XGB)
        decision_results = run_decision_models(X_scaled)
        
        # 6. SHAP Explanations
        explanation = explain_decision(X_scaled)
        
        # 7. Fairness Audit
        fairness = audit_fairness(raw_dict, acs_results["alternative_credit_score"])
        
        # 8. Counterfactual Suggestions
        suggestions = get_improvement_suggestions(raw_dict, engineered, acs_results)
        
        # 9. Final Routing
        ai_decision = route_decision(
            acs_results["alternative_credit_score"],
            decision_results["combined_score"],
            decision_results["uncertain"],
            fairness["fairness_flag"],
            acs_results["score_flags"]
        )
        
        risk_band = get_risk_band(acs_results["alternative_credit_score"])
        
        # 10. Persist to Database
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
                    data_sources_used=raw_dict.get("data_sources_used", {})
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
            top_reason_1=explanation["top_reason_1"],
            top_reason_2=explanation["top_reason_2"],
            shap_values=explanation["shap_values"],
            suggestions=suggestions,
            fairness_flag=fairness["fairness_flag"],
            fairness_detail=fairness["fairness_detail"],
            debt_to_income=engineered["debt_to_income"],
            household_burden=engineered["household_burden"],
            employment_stability=engineered["employment_stability"],
            data_sources_used=raw_dict.get("data_sources_used") or {}
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
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch application: {str(e)}")


@router.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Retrieve dashboard statistics"""
    try:
        applications = db.query(LoanApplication).all()
        
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
                "drift_detected": False,
                "score_distribution": [],
                "decision_breakdown": [],
                "trend_data": [],
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
            "drift_detected": False,
            "score_distribution": score_dist,
            "decision_breakdown": [
                {"name": "Approved", "value": approved, "color": "#10B981"},
                {"name": "Human Review", "value": human_review, "color": "#F59E0B"},
                {"name": "Rejected", "value": rejected, "color": "#EF4444"},
            ],
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
