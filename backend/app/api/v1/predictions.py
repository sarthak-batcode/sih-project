import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.area import Area
from backend.app.models.prediction import PredictionRecord
from backend.app.models.user import User
from backend.app.core.rbac import get_current_user, require_roles
from backend.app.core.audit_logger import log_audit_event
from backend.app.api.v1.settings import get_thresholds
from backend.app.schemas.prediction_schema import (
    PredictionRequest, PredictionResponse, ContributingFactor,
    BatchPredictionResponse, BatchPredictionItem
)
from ml.pipeline.predict import predict_cash_withdrawal_risk, predict_areas_batch

router = APIRouter(prefix="/predict", tags=["Predictive Intelligence"])

@router.post("", response_model=PredictionResponse)
def predict_scenario_risk(
    payload: PredictionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "investigator", "analyst"]))
):
    """
    Executes real-time machine learning prediction for area + temporal window,
    returning calibrated risk probability and Explainable AI (XAI) factors.
    """
    # Fetch Area metadata
    area = db.query(Area).filter(Area.area_id == payload.area_id).first()
    atm_density = payload.area_atm_density if payload.area_atm_density is not None else (area.atm_pos_density if area else 30)
    # The zone's standing risk attribute — the same column the model was trained
    # on. An earlier version passed this into a `local_risk_score` slot that the
    # model had learned from a differently-distributed variable, which pushed
    # almost every live prediction to LOW.
    area_baseline = area.baseline_risk_score if area else 0.40
    area_name = area.area_name if area else f"Surveillance Grid {payload.area_id}"

    # ML Inference
    ml_out = predict_cash_withdrawal_risk(
        hour=payload.hour,
        day_of_week=payload.day_of_week,
        previous_incident_count=payload.previous_incident_count,
        area_atm_density=atm_density,
        time_to_report_mins=payload.time_to_report_mins,
        transaction_amount=payload.transaction_amount,
        transaction_type=payload.transaction_type,
        complaint_category=payload.complaint_category,
        transaction_amount_bucket=payload.transaction_amount_bucket,
        area_baseline_risk_score=area_baseline,
        thresholds=get_thresholds(db),
    )

    # Persist prediction in DB for audit trail
    factors_list = [ContributingFactor(**f) for f in ml_out["contributing_factors"]]
    
    pred_rec = PredictionRecord(
        area_id=payload.area_id,
        area_name=area_name,
        risk_score=ml_out["risk_score"],
        risk_level=ml_out["risk_level"],
        confidence_interval_low=ml_out["confidence_interval"][0],
        confidence_interval_high=ml_out["confidence_interval"][1],
        recommended_action=ml_out["recommended_action"],
        recommended_patrol_window=ml_out["recommended_patrol_window"],
        contributing_factors_json=json.dumps(ml_out["contributing_factors"]),
        model_version=ml_out["model_version"],
        created_by_email=current_user.email
    )
    db.add(pred_rec)
    db.commit()

    # Log audit event
    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="PREDICTION_GENERATED",
        resource=f"/predict/{payload.area_id}",
        details={
            "area_id": payload.area_id,
            "risk_score": ml_out["risk_score"],
            "risk_level": ml_out["risk_level"],
            "hour": payload.hour
        },
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return PredictionResponse(
        area_id=payload.area_id,
        area_name=area_name,
        risk_score=ml_out["risk_score"],
        risk_percentage=ml_out["risk_percentage"],
        risk_level=ml_out["risk_level"],
        confidence_interval=ml_out["confidence_interval"],
        recommended_action=ml_out["recommended_action"],
        recommended_patrol_window=ml_out["recommended_patrol_window"],
        contributing_factors=factors_list,
        attribution_method=ml_out.get("attribution_method"),
        thresholds_applied=ml_out.get("thresholds_applied"),
        model_version=ml_out["model_version"],
        algorithm=ml_out["algorithm"],
        disclaimer=ml_out["disclaimer"]
    )

@router.get("/batch", response_model=BatchPredictionResponse)
def batch_evaluate_all_areas(
    hour: int = 22,
    day_of_week: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Computes automated batch risk forecasts across all 100 surveillance areas."""
    areas = db.query(Area).all()
    if not areas:
        # Load from JSON
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "synthetic_areas.json")
        with open(json_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            areas = [Area(**a) for a in raw]

    thresholds = get_thresholds(db)

    # All areas scored in one model call. The previous loop ran a separate
    # DataFrame build, transform and predict_proba per area, which took ~43
    # seconds for 100 zones — longer than the client's HTTP timeout.
    batch = predict_areas_batch(areas, hour, day_of_week, thresholds)

    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    results = []
    for b in batch:
        a = b["area"]
        counts[b["risk_level"]] += 1
        results.append(BatchPredictionItem(
            area_id=a.area_id,
            area_name=a.area_name,
            state=a.state,
            latitude=a.latitude,
            longitude=a.longitude,
            risk_score=b["risk_score"],
            risk_level=b["risk_level"],
            atm_pos_density=a.atm_pos_density,
            recommended_patrol_window=b["recommended_patrol_window"],
            active_surveillance=a.active_surveillance,
        ))
    crit_count = counts["CRITICAL"]
    high_count = counts["HIGH"]
    med_count = counts["MEDIUM"]
    low_count = counts["LOW"]

    # Sort results by highest risk score descending
    results = sorted(results, key=lambda x: x.risk_score, reverse=True)

    return BatchPredictionResponse(
        total_evaluated_areas=len(results),
        critical_risk_count=crit_count,
        high_risk_count=high_count,
        medium_risk_count=med_count,
        low_risk_count=low_count,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        results=results
    )
