# backend/pipeline/business_rules.py
"""
Business-rule validation layer.
Runs AFTER Pydantic schema validation, BEFORE any feature engineering or ML code.

Returns a structured list of error dicts that match the existing 422 error envelope
used by the RequestValidationError handler in main.py:
  { "field": str, "message": str, "type": str }
"""
from typing import Any, Dict, List


def _err(field: str, message: str, rule_type: str) -> dict:
    """Build a single error entry in the shared 422 envelope format."""
    return {"field": field, "message": message, "type": rule_type}


def validate_business_rules(raw: Dict[str, Any]) -> List[dict]:
    """
    Validates a raw applicant dict against mandatory business rules.

    Returns:
        List of violation dicts (empty list = all rules pass).
        Each dict matches the Pydantic 422 error envelope shape:
            { "field": str, "message": str, "type": str }

    Rules enforced (in evaluation order):
        1. applicant_income > 0
        2. loan_amount > 0
        3. loan_term > 0  (months)
        4. dependents >= 0
        5. 18 <= age <= 100
    """
    errors: List[dict] = []

    # ── 1. Applicant Income ────────────────────────────────────────────────────
    applicant_income = raw.get("applicant_income")
    if applicant_income is None or applicant_income <= 0:
        errors.append(_err(
            field="applicant_income",
            message="Applicant income must be greater than 0.",
            rule_type="business_rule.income_positive"
        ))

    # ── 2. Loan Amount ─────────────────────────────────────────────────────────
    loan_amount = raw.get("loan_amount")
    if loan_amount is None or loan_amount <= 0:
        errors.append(_err(
            field="loan_amount",
            message="Loan amount must be greater than 0.",
            rule_type="business_rule.loan_amount_positive"
        ))

    # ── 3. Loan Term ──────────────────────────────────────────────────────────
    loan_term = raw.get("loan_term")
    if loan_term is None or loan_term <= 0:
        errors.append(_err(
            field="loan_term",
            message="Loan term must be at least 1 month.",
            rule_type="business_rule.loan_term_positive"
        ))

    # ── 4. Dependents ─────────────────────────────────────────────────────────
    dependents = raw.get("dependents", 0)
    if dependents is not None and dependents < 0:
        errors.append(_err(
            field="dependents",
            message="Number of dependents cannot be negative.",
            rule_type="business_rule.dependents_non_negative"
        ))

    # ── 5. Age ────────────────────────────────────────────────────────────────
    age = raw.get("age")
    if age is None or not (18 <= age <= 100):
        errors.append(_err(
            field="age",
            message="Applicant age must be between 18 and 100 (inclusive).",
            rule_type="business_rule.age_range"
        ))

    return errors
