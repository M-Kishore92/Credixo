# backend/pipeline/features.py

# Training population distribution constants for income_per_dependent min-max scaling
TRAIN_MIN_INCOME_PER_DEP = 300.0
TRAIN_MAX_INCOME_PER_DEP = 50000.0

def compute_engineered_features(data):
    """
    Computes proxy features: Debt-to-income, Household burden, and Employment stability.
    """
    applicant_income = float(data.get("applicant_income", 0.0) or 0.0)
    coapplicant_income = data.get("coapplicant_income")
    loan_amount = float(data.get("loan_amount", 0.0) or 0.0)
    loan_term_months = float(data.get("loan_term_months") or data.get("loan_term") or 12.0)
    dependents = int(data.get("dependents", 0) or 0)
    employment_type = data.get("employment_type", "Daily wage")

    # 1. Debt-to-income ratio (DTI): EMI = loan_amount / loan_term_months
    # debt_to_income = EMI / applicant_income
    # Missing co-applicant income is excluded entirely from the ratio calculation
    if loan_term_months > 0:
        emi = loan_amount / loan_term_months
    else:
        emi = loan_amount

    if applicant_income > 0.0:
        dti = emi / applicant_income
    else:
        dti = 20.0
    dti = min(20.0, max(0.0, dti))

    # 2. Household burden index: income_per_dependent = household_income / (dependents + 1)
    # Missing co-applicant income is excluded (not defaulted to 0 in denominator)
    if coapplicant_income is not None and float(coapplicant_income) > 0.0:
        household_income = applicant_income + float(coapplicant_income)
    else:
        household_income = applicant_income

    income_per_dependent = household_income / (dependents + 1.0)
    
    # Min-max scale against training population distribution to produce a 0-1 index
    scaled_burden = (income_per_dependent - TRAIN_MIN_INCOME_PER_DEP) / (TRAIN_MAX_INCOME_PER_DEP - TRAIN_MIN_INCOME_PER_DEP)
    household_burden = min(1.0, max(0.0, scaled_burden))

    # 3. Employment stability score:
    # Note: Employment stability is a provisional, non-empirical ranking
    # (Salaried=3, Self-employed=2, Farmer=1.5, Daily wage=1) pending a labor-income-volatility citation.
    stability_map = {
        "Salaried": 3.0,
        "Self-employed": 2.0,
        "Farmer": 1.5,
        "Daily wage": 1.0
    }
    employment_stability = stability_map.get(employment_type, 1.0)

    return {
        "debt_to_income": dti,
        "household_burden": household_burden,
        "employment_stability": employment_stability
    }

