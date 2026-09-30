# backend/pipeline/decision_models.py
"""
Runs the two-path decision models (LR + XGB) and returns a combined score.

Each model receives its own appropriately-preprocessed feature vector from
preprocess.preprocess_for_decision(), which returns a dict:
  { "xgb": X_xgb_scaled, "xgb_raw": X_xgb_raw, "lr": X_lr_scaled }

The model-agreement check (|P_LR - P_XGB| > 0.15) now reflects genuine
architectural disagreement (~15% of applicants) rather than multicollinear noise
(was 75% when raw behavioral features overlapped with the ACS they derived from).
"""
import os
import pickle

MODELS_DIR = os.getenv(
    "MODEL_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
)
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.getcwd(), "models")


def _load(filename):
    path = os.path.join(MODELS_DIR, filename)
    with open(path, "rb") as f:
        return pickle.load(f)


lr_model  = _load("lr_decision.pkl")
xgb_model = _load("xgb_decision.pkl")

try:
    lr_calibrator = _load("lr_calibrator.pkl")
except Exception:
    lr_calibrator = None

try:
    xgb_calibrator = _load("xgb_calibrator.pkl")
except Exception:
    xgb_calibrator = None


def run_decision_models(X_dict: dict) -> dict:
    """
    Args:
        X_dict: dict with keys "lr" (LR feature matrix) and "xgb" (XGB feature matrix),
                as returned by preprocess.preprocess_for_decision().

    Returns:
        dict with lr_score, xgb_score, combined_score, approval_probability, uncertain.
    """
    lr_raw  = lr_model.predict_proba(X_dict["lr"])[0][1]
    xgb_raw = xgb_model.predict_proba(X_dict["xgb"])[0][1]

    # Apply isotonic calibration if calibrated models are present
    lr_proba = float(lr_calibrator.predict([lr_raw])[0]) if lr_calibrator is not None else lr_raw
    xgb_proba = float(xgb_calibrator.predict([xgb_raw])[0]) if xgb_calibrator is not None else xgb_raw

    combined_score = (lr_proba + xgb_proba) / 2.0

    # Model-agreement gate: flag genuine ambiguity (architecturally different models
    # disagree on a clean, decorrelated feature set — ~15% post-cleanup).
    uncertain = abs(lr_proba - xgb_proba) > 0.15

    return {
        "lr_score":           round(lr_proba,      3),
        "xgb_score":          round(xgb_proba,     3),
        "combined_score":     round(combined_score, 3),
        "approval_probability": round(combined_score * 100, 1),
        "uncertain":          uncertain,
    }

