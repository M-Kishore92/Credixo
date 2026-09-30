# backend/pipeline/verification.py

# Verification Sources
SOURCE_AA_VERIFIED = "aa_verified"
SOURCE_ULI_VERIFIED = "uli_verified"
SOURCE_SELF_REPORTED = "self_reported"

def tag_verification_sources(raw_data):
    """
    STUB: Assigns verification source tags to applicant input fields.
    Default: 'self_reported'.
    When AA/ULI consent is granted (via verification_mode == 'aa_uli' or data_sources_used),
    simulates AA / ULI verified data pull.
    Structured for drop-in replacement with live Sahamati AA / RBI ULI connectors.
    """
    consent_mode = raw_data.get("verification_mode") or raw_data.get("consent_verification_mode")
    data_sources = raw_data.get("data_sources_used") or {}
    has_aa_consent = consent_mode in ["aa_uli", "consent_granted"] or bool(data_sources.get("aa_consent"))
    
    sources = {}
    
    # 1. Income verification (AA connector stub)
    sources["applicant_income"] = SOURCE_AA_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    if raw_data.get("coapplicant_income"):
        sources["coapplicant_income"] = SOURCE_AA_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
        
    # 2. Utility & Electricity (ULI connector stub)
    sources["electricity_bill_avg"] = SOURCE_ULI_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    sources["electricity_payment_regularity"] = SOURCE_ULI_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    sources["utility_payment_consistency"] = SOURCE_ULI_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    
    # 3. Mobile & Telecom spending (AA / Telecom data stub)
    sources["mobile_recharge_amount"] = SOURCE_AA_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    sources["mobile_recharge_frequency"] = SOURCE_AA_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
    
    # 4. Prior Repayment
    if raw_data.get("prior_repayment_record") is not None:
        sources["prior_repayment_record"] = SOURCE_AA_VERIFIED if has_aa_consent else SOURCE_SELF_REPORTED
        
    # Calculate majority
    self_reported_count = sum(1 for src in sources.values() if src == SOURCE_SELF_REPORTED)
    verified_count = sum(1 for src in sources.values() if src in [SOURCE_AA_VERIFIED, SOURCE_ULI_VERIFIED])
    majority_self_reported = self_reported_count >= verified_count
    
    return {
        "sources": sources,
        "income_verification_source": sources.get("applicant_income", SOURCE_SELF_REPORTED),
        "majority_self_reported": majority_self_reported,
        "verified_fields_count": verified_count,
        "self_reported_fields_count": self_reported_count
    }
