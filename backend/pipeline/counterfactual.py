# backend/pipeline/counterfactual.py

def get_improvement_suggestions(raw_data, engineered_features, acs_results):
    """
    Generates tailored suggestions for improving the credit score or approval likelihood.
    """
    suggestions = []
    
    # Context data for rules
    d = {
        "debt_to_income": engineered_features["debt_to_income"],
        "electricity_payment_regularity": raw_data.get("electricity_payment_regularity"),
        "employment_type": raw_data.get("employment_type"),
        "applicant_income": raw_data.get("applicant_income", 0),
        "coapplicant_income": raw_data.get("coapplicant_income", 0),
        "loan_amount": raw_data.get("loan_amount", 0),
        "income_affordability_score": acs_results["income_affordability_score"],
        "prior_repayment_record": raw_data.get("prior_repayment_record")
    }

    # 1. Reduce Loan Suggestion
    if d["debt_to_income"] > 3.0:
        reduce_by = int(d["loan_amount"] - (d["applicant_income"] * 10))
        # Round to nearest Rs 1000
        reduce_by = round(reduce_by / 1000) * 1000
        if reduce_by > 0:
            suggestions.append(f"Reduce the loan amount by ₹{reduce_by:,} to bring the debt-to-income ratio below 3.")

    # 2. Pay Bills Suggestion
    if d["electricity_payment_regularity"] is not None and d["electricity_payment_regularity"] < 0.8:
        suggestions.append("Paying electricity and utility bills on time for the next 3 months will increase your behavioral score.")

    # 3. Add Co-applicant
    if d["coapplicant_income"] == 0 and d["employment_type"] in ["Daily wage", "Farmer", "Self-employed"]:
        suggestions.append("Adding a co-applicant with steady income can significantly improve the affordability score.")

    # 4. Income Docs (Employment filtered)
    if d["employment_type"] in ["Salaried", "Self-employed"] and d["applicant_income"] < d["loan_amount"] / 12:
        suggestions.append("Providing formal income documentation (salary slip or ITR) may unlock a higher loan limit.")

    # 5. Farmer specific
    if d["employment_type"] == "Farmer":
        suggestions.append("Submitting land ownership documents as collateral can move this application to direct approval.")
        if d["income_affordability_score"] < 50:
            suggestions.append("Applying after the harvest season when declared income is higher may improve the income score.")

    # 6. First-time borrower
    if d["prior_repayment_record"] is None:
        suggestions.append("This is a first-time loan application. Repaying this loan on time will establish your repayment record and significantly improve future scoring.")

    return suggestions[:3] # Max 3 suggestions
