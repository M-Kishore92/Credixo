# backend/pipeline/decision_models.py
import os
import pickle

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")

# Load models at module level
with open(os.path.join(MODELS_DIR, "lr_decision.pkl"), "rb") as f:
    lr_model = pickle.load(f)
with open(os.path.join(MODELS_DIR, "xgb_decision.pkl"), "rb") as f:
    xgb_model = pickle.load(f)

def run_decision_models(X_scaled):
    """
    Runs both LR and XGB models and computes a combined score.
    """
    lr_proba = lr_model.predict_proba(X_scaled)[0][1]
    xgb_proba = xgb_model.predict_proba(X_scaled)[0][1]
    
    combined_score = (lr_proba + xgb_proba) / 2
    
    # Model agreement check (Uncertain if difference exceeds thresholds)
    uncertain = abs(lr_proba - xgb_proba) > 0.15
    
    return {
        "lr_score": round(lr_proba, 3),
        "xgb_score": round(xgb_proba, 3),
        "combined_score": round(combined_score, 3),
        "approval_probability": round(combined_score * 100, 1),
        "uncertain": uncertain
    }
