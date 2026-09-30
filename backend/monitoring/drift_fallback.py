# backend/monitoring/drift_fallback.py
"""
Automated Drift Detection & Safety Fallback Layer.

Monitors statistical drift between training reference distributions and production inference distributions
using Evidently AI / Kolmogorov-Smirnov & Wasserstein metric tests.

When statistical drift crosses the defined hard threshold:
  - Automatically activates DRIFT FALLBACK MODE.
  - Intercepts loan scoring pipeline in decision_engine.py and routes all subsequent applications
    to 'Human Review' (or Phase 1 rule-based fallback scorecard) until a retrained, validated model is promoted.
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Hard threshold constants
DRIFT_SHARE_HARD_THRESHOLD = 0.30  # If >30% of input features drift, trigger fallback
CRITICAL_DRIFT_FEATURES = ['applicant_income', 'alternative_credit_score', 'loan_amount', 'electricity_bill_avg']
FALLBACK_STATE_FILE = os.path.join(os.path.dirname(__file__), "drift_fallback_state.json")

def get_drift_fallback_status() -> Dict[str, Any]:
    """
    Reads the current persistent drift fallback state.
    """
    if os.path.exists(FALLBACK_STATE_FILE):
        try:
            with open(FALLBACK_STATE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Default initial state: Inactive
    return {
        "fallback_active": False,
        "drift_detected": False,
        "drift_share": 0.0,
        "drifting_features": [],
        "trigger_reason": None,
        "last_evaluated_at": None,
        "mode": "STANDARD_AI_MODELS"  # "STANDARD_AI_MODELS" or "HUMAN_REVIEW_FALLBACK"
    }

def set_drift_override_mode(active: bool, reason: Optional[str] = None, drift_share: float = 0.0, drifting_features: Optional[list] = None) -> Dict[str, Any]:
    """
    Sets the drift fallback state (manual override or automated from Evidently drift report).
    """
    state = {
        "fallback_active": active,
        "drift_detected": active,
        "drift_share": round(drift_share, 4),
        "drifting_features": drifting_features or [],
        "trigger_reason": reason or ("Automated Drift Threshold Exceeded (>30% features)" if active else "Manually Reset / Model Promoted"),
        "last_evaluated_at": datetime.utcnow().isoformat(),
        "mode": "HUMAN_REVIEW_FALLBACK" if active else "STANDARD_AI_MODELS"
    }
    
    try:
        with open(FALLBACK_STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[DRIFT FALLBACK] Failed to write state file: {e}")
        
    return state

def is_drift_fallback_active() -> bool:
    """
    Fast boolean check used by decision_engine.py at Step 0 of routing.
    """
    status = get_drift_fallback_status()
    return bool(status.get("fallback_active", False))

def evaluate_drift_and_update_state(drift_share: float, drifting_features: list, dataset_drift_flag: bool = False) -> Dict[str, Any]:
    """
    Evaluates drift metrics from Evidently and triggers fallback if thresholds are crossed.
    """
    # Rule 1: Overall drift share exceeds 30%
    exceeds_share = drift_share >= DRIFT_SHARE_HARD_THRESHOLD
    
    # Rule 2: Critical feature drift (any 2+ critical features drifting)
    critical_drifts = [f for f in drifting_features if f in CRITICAL_DRIFT_FEATURES]
    critical_trigger = len(critical_drifts) >= 2
    
    should_activate = exceeds_share or critical_trigger or dataset_drift_flag
    
    reasons = []
    if exceeds_share:
        reasons.append(f"Drift share ({drift_share:.1%}) >= threshold ({DRIFT_SHARE_HARD_THRESHOLD:.1%})")
    if critical_trigger:
        reasons.append(f"Critical features drifting: {critical_drifts}")
    if dataset_drift_flag:
        reasons.append("Evidently DatasetDriftPreset flagged significant distribution divergence")
        
    trigger_reason = " | ".join(reasons) if should_activate else None
    
    return set_drift_override_mode(
        active=should_activate,
        reason=trigger_reason,
        drift_share=drift_share,
        drifting_features=drifting_features
    )
