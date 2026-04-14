# backend/api/predict.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import uuid
import datetime

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
    loan_term_months: int
    loan_purpose: str

    # Behavioral Signals
    electricity_bill_avg: Optional[float] = None
    electricity_payment_regularity: Optional[float] = None
    mobile_recharge_avg: Optional[float] = None
    mobile_recharge_frequency: Optional[float] = None
    utility_payment_consistency: Optional[float] = None
    govt_socioeconomic_category: Optional[str] = None

    # Credit History
    credit_category: str = "None"
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
        db_app = LoanApplication(
            id=app_id,
            **{k: v for k, v in raw_dict.items() if k != "data_sources_used"},
            **engineered,
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
            data_sources_used=raw_dict.get("data_sources_used", {})
        )
        
    except Exception as e:
        # Log error in real implementation
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")
