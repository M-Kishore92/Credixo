# backend/pipeline/features.py

def compute_engineered_features(data):
    """
    Computes proxy features: Debt-to-income, Household burden, and Employment stability.
    """
    applicant_income = data.get("applicant_income", 0)
    coapplicant_income = data.get("coapplicant_income", 0)
    loan_amount = data.get("loan_amount", 0)
    dependents = data.get("dependents", 0)
    employment_type = data.get("employment_type", "Daily wage")

    # 1. Debt-to-income ratio (DTI)
    # Using Monthly income vs Loan amount for this proxy
    if applicant_income > 0:
        dti = loan_amount / applicant_income
    else:
        dti = 20.0
    dti = min(20.0, dti)

    # 2. Household burden score
    total_household_income = applicant_income + coapplicant_income
    if total_household_income > 0:
        household_burden = dependents / total_household_income
    else:
        # If no income but dependents, burden is high
        household_burden = 5.0 if dependents > 0 else 0.0
    household_burden = min(5.0, household_burden)

    # 3. Employment stability score
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
