# backend/api/appeal.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from db.session import get_db
from db.models import LoanApplication
from pipeline.compliance import GRIEVANCE_OFFICER_NAME, GRIEVANCE_OFFICER_EMAIL, GRIEVANCE_SLA_DAYS

router = APIRouter()

class AppealSubmitInput(BaseModel):
    application_id: str
    reason: str
    additional_income_declared: Optional[float] = None
    additional_documents: Optional[List[str]] = None
    borrower_notes: Optional[str] = None
    contact_email: Optional[str] = None

class AppealResolveInput(BaseModel):
    officer_id: str
    resolution_decision: str  # "Approve", "Uphold Rejection", "Further Documents Requested"
    resolution_notes: str

@router.post("/appeal")
async def submit_appeal(input_data: AppealSubmitInput, db: Session = Depends(get_db)):
    """
    Submits a formal contestation/appeal for an adverse loan decision.
    Logs appeal reason alongside original SHAP values, risk scores, and reasons.
    """
    try:
        app = db.query(LoanApplication).filter(LoanApplication.id == input_data.application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Loan application not found.")
            
        appeal_timestamp = datetime.utcnow().isoformat()
        
        appeal_record = {
            "application_id": app.id,
            "submitted_at": appeal_timestamp,
            "reason": input_data.reason,
            "borrower_notes": input_data.borrower_notes,
            "additional_income_declared": input_data.additional_income_declared,
            "additional_documents": input_data.additional_documents or [],
            "contact_email": input_data.contact_email or app.grievance_officer_email,
            "original_decision": app.ai_decision,
            "original_score": app.alternative_credit_score,
            "original_reasons": [app.top_reason_1, app.top_reason_2],
            "original_shap_features": app.shap_values_json or {},
            "grievance_officer_assigned": app.grievance_officer_name,
            "sla_resolution_days": app.grievance_sla_days or GRIEVANCE_SLA_DAYS,
            "status": "Requested"
        }
        
        app.appeal_status = "Requested"
        app.appeal_reason = input_data.reason
        app.appeal_documents_json = appeal_record
        db.commit()
        
        return {
            "success": True,
            "message": "Appeal formally registered. You will receive a resolution from the Grievance Redressal Officer within 30 days.",
            "application_id": app.id,
            "appeal_status": "Requested",
            "grievance_officer": app.grievance_officer_name,
            "grievance_email": app.grievance_officer_email,
            "sla_days": app.grievance_sla_days,
            "submitted_at": appeal_timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit appeal: {str(e)}")

@router.get("/appeal/{application_id}")
async def get_appeal_status(application_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the status and review timeline of an appeal.
    """
    try:
        app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Loan application not found.")
            
        return {
            "application_id": app.id,
            "applicant_name": app.full_name or f"Applicant {app.id[:8]}",
            "decision": app.ai_decision,
            "score": app.alternative_credit_score,
            "appeal_status": app.appeal_status or "None",
            "appeal_reason": app.appeal_reason,
            "appeal_details": app.appeal_documents_json or {},
            "appeal_response": app.appeal_response_json or {},
            "grievance_officer": {
                "id": app.grievance_officer_id,
                "name": app.grievance_officer_name,
                "email": app.grievance_officer_email,
                "sla_days": app.grievance_sla_days or 30
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch appeal: {str(e)}")

@router.post("/appeal/{application_id}/resolve")
async def resolve_appeal(application_id: str, resolve_data: AppealResolveInput, db: Session = Depends(get_db)):
    """
    Allows a Loan Officer or Grievance Redressal Officer to resolve an appeal.
    """
    try:
        app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Loan application not found.")
            
        resolved_at = datetime.utcnow().isoformat()
        
        resolution = {
            "resolved_by": resolve_data.officer_id,
            "resolved_at": resolved_at,
            "resolution_decision": resolve_data.resolution_decision,
            "resolution_notes": resolve_data.resolution_notes
        }
        
        app.appeal_status = "Resolved"
        app.appeal_response_json = resolution
        app.officer_decision = resolve_data.resolution_decision
        app.officer_id = resolve_data.officer_id
        
        if resolve_data.resolution_decision == "Approve":
            app.ai_decision = "Approve"
            
        db.commit()
        return {
            "success": True,
            "message": f"Appeal resolved with decision: {resolve_data.resolution_decision}",
            "application_id": app.id,
            "appeal_status": "Resolved",
            "resolution": resolution
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to resolve appeal: {str(e)}")
