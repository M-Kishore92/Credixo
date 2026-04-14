# backend/db/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
import uuid
from datetime import datetime

Base = declarative_base()

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Inputs
    gender = Column(String)
    age = Column(Integer)
    marital_status = Column(String)
    education = Column(String)
    applicant_income = Column(Float)
    coapplicant_income = Column(Float)
    loan_amount = Column(Float)
    loan_term = Column(Integer)
    loan_purpose = Column(String)
    dependents = Column(Integer)
    area_type = Column(String)
    employment_type = Column(String)
    
    electricity_bill_avg = Column(Float, nullable=True)
    electricity_payment_regularity = Column(Float, nullable=True)
    mobile_recharge_amount = Column(Float, nullable=True)
    mobile_recharge_frequency = Column(Float, nullable=True)
    utility_payment_consistency = Column(Float, nullable=True)
    prior_repayment_record = Column(Float, nullable=True)
    govt_socioeconomic_category = Column(String, nullable=True)
    credit_score_category = Column(String)
    
    # Engineered Proxy Features
    debt_to_income = Column(Float)
    household_burden = Column(Float)
    employment_stability = Column(Float)
    
    # Model Outputs
    behavior_repayment_score = Column(Float)
    income_affordability_score = Column(Float)
    alternative_credit_score = Column(Float)
    risk_band = Column(String)
    
    lr_score = Column(Float)
    xgb_score = Column(Float)
    combined_score = Column(Float)
    ai_decision = Column(String)
    
    # Explainability & Recourse
    shap_values_json = Column(JSON)
    top_reason_1 = Column(String)
    top_reason_2 = Column(String)
    suggestions_json = Column(JSON)
    
    # Audit
    fairness_flag = Column(Boolean)
    fairness_detail = Column(String, nullable=True)
    
    # Human Loop
    officer_decision = Column(String, nullable=True)
    officer_id = Column(String, nullable=True)
    data_sources_used = Column(JSON, nullable=True)
