# backend/pipeline/preprocess.py
"""
Decision-stage feature preprocessing.

Produces TWO separate feature vectors — one per model — so each model's
encoding strategy is appropriate for its architecture:

  XGB path (14 features):
    - Categoricals: label-encoded  [gender, marital_status, education,
                                    employment_type, area_type, loan_purpose,
                                    credit_category]
    - Numerics:     standard-scaled [age, applicant_income, coapplicant_income,
                                    loan_amount, loan_term_months, dependents,
                                    alternative_credit_score]

  LR  path (dynamic width after OHE expansion):
    - OHE:          gender, area_type, employment_type  (avoids ordinal bias
                    in a linear model for protected/quasi-protected attributes)
    - Label:        marital_status, education, loan_purpose, credit_category
    - Numerics:     same 7 as XGB

Raw behavioral signals (electricity, mobile, utility, prior_repayment) are
intentionally ABSENT — they are already summarised by alternative_credit_score
(Model A output) and including them would create multicollinear noise that
causes systematic LR/XGB divergence (~75% disagreement → ~15% after removal).

govt_socioeconomic_category is excluded (display-only context, not a scoring input).
"""
import numpy as np
import os
import pickle

MODELS_DIR = os.getenv(
    "MODEL_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
)
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")

# ── Load artefacts ────────────────────────────────────────────────────────────
with open(os.path.join(MODELS_DIR, "label_encoders.pkl"), "rb") as f:
    _label_encoders = pickle.load(f)
with open(os.path.join(MODELS_DIR, "scaler_xgb.pkl"), "rb") as f:
    _scaler_xgb = pickle.load(f)
with open(os.path.join(MODELS_DIR, "scaler_lr.pkl"), "rb") as f:
    _scaler_lr = pickle.load(f)
with open(os.path.join(MODELS_DIR, "ohe_lr.pkl"), "rb") as f:
    _ohe_lr = pickle.load(f)

# ── Feature definitions (must match train_models.py exactly) ──────────────────
CAT_LABEL_XGB = [
    'gender', 'marital_status', 'education',
    'employment_type', 'area_type', 'loan_purpose', 'credit_category',
]
CAT_OHE_LR  = ['gender', 'area_type', 'employment_type']
CAT_LABEL_LR = ['marital_status', 'education', 'loan_purpose', 'credit_category']
NUM_COLS = [
    'age', 'applicant_income', 'coapplicant_income',
    'loan_amount', 'loan_term_months', 'dependents',
    'alternative_credit_score',
]
XGB_FEATURES = CAT_LABEL_XGB + NUM_COLS   # 14 total

# Numeric defaults for mean-imputation (consistent with training)
_NUM_DEFAULTS = {
    'age':                       38,
    'applicant_income':       15000,
    'coapplicant_income':         0,
    'loan_amount':            50000,
    'loan_term_months':          36,
    'dependents':                 2,
    'alternative_credit_score':  50,
}


def _encode_cat_label(col: str, raw_value) -> int:
    """Label-encode a single categorical value; falls back to 0 on unseen labels."""
    le = _label_encoders.get(col) or _label_encoders.get(
        'credit_category' if col == 'credit_score_category' else col
    )
    if le is None:
        return 0
    val = str(raw_value) if raw_value is not None else ''
    try:
        return int(le.transform([val])[0])
    except ValueError:
        return 0


def _get_num(raw_data: dict, col: str, acs_results: dict) -> float:
    """Retrieve a numeric feature value; ACS comes from acs_results, rest from raw."""
    if col == 'alternative_credit_score':
        return float(acs_results.get('alternative_credit_score', 50))
    # Map predict.py field name loan_term → loan_term_months used in training
    key = 'loan_term' if col == 'loan_term_months' else col
    val = raw_data.get(key)
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return float(_NUM_DEFAULTS.get(col, 0))
    return float(val)


def preprocess_for_decision(raw_data: dict, normalized_data, engineered_features, acs_results: dict):
    """
    Returns a dict with two aligned feature matrices:
      {
        "xgb":     np.ndarray shape (1, 14)  — scaled, for XGBClassifier
        "xgb_raw": np.ndarray shape (1, 14)  — unscaled, for SHAP
        "lr":      np.ndarray shape (1, W)   — scaled, for LogisticRegression
      }
    W varies with OHE expansion of gender/area_type/employment_type.
    """
    # ── XGB vector ────────────────────────────────────────────────────────────
    xgb_vec = []
    for col in CAT_LABEL_XGB:
        xgb_vec.append(_encode_cat_label(col, raw_data.get(col, '')))
    for col in NUM_COLS:
        xgb_vec.append(_get_num(raw_data, col, acs_results))

    X_xgb_raw = np.array(xgb_vec, dtype=float).reshape(1, -1)
    X_xgb     = _scaler_xgb.transform(X_xgb_raw)

    # ── LR vector ─────────────────────────────────────────────────────────────
    # OHE block: gender, area_type, employment_type
    ohe_input = [[
        str(raw_data.get('gender',          '') or ''),
        str(raw_data.get('area_type',        '') or ''),
        str(raw_data.get('employment_type',  '') or ''),
    ]]
    ohe_arr = _ohe_lr.transform(ohe_input)   # shape (1, n_ohe_cols)

    # Label block for LR
    label_lr = [_encode_cat_label(col, raw_data.get(col, '')) for col in CAT_LABEL_LR]

    # Numeric block (same as XGB)
    num_vals = [_get_num(raw_data, col, acs_results) for col in NUM_COLS]

    X_lr_raw = np.hstack([ohe_arr, np.array(label_lr + num_vals).reshape(1, -1)])
    X_lr     = _scaler_lr.transform(X_lr_raw)

    return {
        "xgb":     X_xgb,
        "xgb_raw": X_xgb_raw,
        "lr":      X_lr,
    }
