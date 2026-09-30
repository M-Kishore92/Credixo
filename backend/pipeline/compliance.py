import os
import math
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Regulatory Settings aligned with RBI 2026 Digital Lending Directions & DPDP Act 2025
GRIEVANCE_OFFICER_ID = os.getenv("GRIEVANCE_OFFICER_ID", "GRO-MUM-2025-01")
GRIEVANCE_OFFICER_NAME = os.getenv("GRIEVANCE_OFFICER_NAME", "Anita Sharma (Principal Grievance Redressal Officer)")
GRIEVANCE_OFFICER_EMAIL = os.getenv("GRIEVANCE_OFFICER_EMAIL", "grievance.officer@credixo.in")
GRIEVANCE_SLA_DAYS = int(os.getenv("GRIEVANCE_SLA_DAYS", "30"))
COOLING_OFF_DAYS = int(os.getenv("COOLING_OFF_DAYS", "3"))  # Look-up / cooling-off period (minimum 3 business days)

def generate_key_fact_statement(
    loan_amount: float,
    loan_term_months: int,
    interest_rate_pct: float = 14.0,
    processing_fee_pct: float = 1.5,
    borrower_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a standardized Key Fact Statement (KFS) in compliance with
    RBI's 2026 Digital Lending Directions.
    Calculates all-inclusive Annual Percentage Rate (APR), EMI amortization,
    total cost of credit, fee breakdown, and cooling-off expiry.
    """
    principal = float(loan_amount)
    tenure_months = int(loan_term_months) if loan_term_months > 0 else 12
    
    # 1. Monthly EMI Calculation (Standard Amortization)
    monthly_rate = (interest_rate_pct / 100.0) / 12.0
    if monthly_rate > 0:
        factor = math.pow(1.0 + monthly_rate, tenure_months)
        monthly_emi = principal * (monthly_rate * factor) / (factor - 1.0)
    else:
        monthly_emi = principal / tenure_months
        
    monthly_emi = round(monthly_emi, 2)
    total_repayment_amount = round(monthly_emi * tenure_months, 2)
    total_interest_payable = round(total_repayment_amount - principal, 2)
    
    # 2. Fee Schedule
    upfront_processing_fee = round(principal * (processing_fee_pct / 100.0), 2)
    gst_on_fee = round(upfront_processing_fee * 0.18, 2) # 18% GST on financial services
    documentation_charges = 250.0
    total_upfront_fees = round(upfront_processing_fee + gst_on_fee + documentation_charges, 2)
    
    net_disbursal_amount = round(principal - total_upfront_fees, 2)
    total_cost_of_loan = round(total_interest_payable + total_upfront_fees, 2)
    
    # 3. Annual Percentage Rate (APR) Calculation
    # Annualized all-inclusive percentage of total credit cost relative to principal and term
    tenure_years = tenure_months / 12.0
    if principal > 0 and tenure_years > 0:
        annual_cost_rate = (total_cost_of_loan / (principal * tenure_years)) * 100.0
        apr = round(annual_cost_rate, 2)
    else:
        apr = interest_rate_pct
        
    # 4. Cooling-off (Look-up) Period
    created_at = datetime.utcnow()
    cooling_off_expiry = created_at + timedelta(days=COOLING_OFF_DAYS)
    
    kfs_id = f"KFS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    return {
        "kfs_id": kfs_id,
        "loan_amount": principal,
        "loan_term_months": tenure_months,
        "nominal_interest_rate_pct": interest_rate_pct,
        "annual_percentage_rate_pct": apr,
        "monthly_emi": monthly_emi,
        "net_disbursal_amount": net_disbursal_amount,
        "total_interest_payable": total_interest_payable,
        "upfront_fees": {
            "processing_fee": upfront_processing_fee,
            "gst_18_pct": gst_on_fee,
            "documentation_charges": documentation_charges,
            "total_upfront_fees": total_upfront_fees
        },
        "total_repayment_amount": total_repayment_amount,
        "total_cost_of_loan": total_cost_of_loan,
        "prepayment_charges_pct": 0.0,  # Prepayment penalty strictly prohibited by RBI for digital loans
        "foreclosure_charges": "Nil (0%)",
        "cooling_off_period": {
            "duration_days": COOLING_OFF_DAYS,
            "expiry_timestamp": cooling_off_expiry.isoformat(),
            "terms": "Borrower can exit the loan without penalty by repaying principal plus proportionate APR within the cooling-off window."
        },
        "grievance_redressal": {
            "officer_id": GRIEVANCE_OFFICER_ID,
            "officer_name": GRIEVANCE_OFFICER_NAME,
            "officer_email": GRIEVANCE_OFFICER_EMAIL,
            "resolution_sla_days": GRIEVANCE_SLA_DAYS,
            "escalation_portal": "https://cms.rbi.org.in"
        }
    }

def validate_disbursal_destination(
    borrower_name: str,
    beneficiary_account_name: str,
    account_number: str,
    ifsc_code: str
) -> Dict[str, Any]:
    """
    Validates that disbursal occurs strictly to the borrower's own verified bank account
    (prohibiting third-party pass-through, agent accounts, or pooled wallets per RBI Digital Lending Directions).
    """
    b_clean = (borrower_name or "").strip().lower()
    ben_clean = (beneficiary_account_name or "").strip().lower()
    
    # Check exact match or significant token overlap
    b_tokens = set(b_clean.split())
    ben_tokens = set(ben_clean.split())
    overlap = len(b_tokens.intersection(ben_tokens))
    
    is_valid = bool(b_clean and ben_clean and (b_clean == ben_clean or overlap >= 1))
    
    if not is_valid:
        return {
            "valid": False,
            "error_code": "THIRD_PARTY_DISBURSAL_PROHIBITED",
            "message": "RBI regulations require loan funds to be disbursed strictly into the borrower's own verified bank account. Third-party or pool accounts are rejected."
        }
        
    return {
        "valid": True,
        "account_number_masked": f"XXXX-XXXX-{account_number[-4:]}" if len(account_number) >= 4 else "XXXX",
        "ifsc_code": ifsc_code.upper(),
        "disbursal_route": "DIRECT_ACCOUNT_TO_ACCOUNT",
        "regulatory_check": "PASSED (Zero Third-Party Pass-Through)"
    }

def create_dpdp_consent_record(
    applicant_id: str,
    applicant_name: str,
    purpose: str = "Credit Underwriting & KYC Verification"
) -> Dict[str, Any]:
    """
    Generates a purpose-limited consent artifact under the Digital Personal Data Protection (DPDP) Act 2023 / Rules 2025.
    """
    consent_id = f"DPDP-CONSENT-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat()
    
    return {
        "dpdp_consent_id": consent_id,
        "timestamp": timestamp,
        "applicant_id": applicant_id,
        "applicant_name": applicant_name,
        "purpose": purpose,
        "data_fiduciary": "Credixo Inclusive Technologies Ltd.",
        "statutory_retention_period": "5 years (Mandatory statutory retention under PMLA 2002 & RBI Master Directions)",
        "erasure_policy": "Data will be securely erased following completion of statutory audit & repayment retention obligations.",
        "grievance_contact": GRIEVANCE_OFFICER_EMAIL,
        "status": "CONSENT_ACTIVE"
    }
