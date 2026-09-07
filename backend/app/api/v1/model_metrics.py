import os
import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from backend.app.core.rbac import get_current_user
from backend.app.models.user import User
from backend.app.config import settings

router = APIRouter(prefix="/model", tags=["Model Governance & MLOps"])

@router.get("/metrics")
def get_model_metrics(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns model benchmark comparisons, ROC curve coordinates, and confusion matrices."""
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Model metadata not found. Train model first.")

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data

@router.get("/feature-importance")
def get_feature_importances(current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Returns top ranked global feature importances for explainability."""
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        return []

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data.get("top_feature_importances", [])
