import os
import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.area import Area
from backend.app.models.complaint import Complaint
from backend.app.api.v1.settings import get_settings_row, get_thresholds
from backend.app.schemas.dashboard_schema import DashboardSummaryResponse, AlertItem
from backend.app.config import settings
from ml.pipeline.predict import predict_cash_withdrawal_risk, predict_areas_batch

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# The recommended action shown against an alert, by severity.
ACTION_BY_SEVERITY = {
    "CRITICAL": "Dispatch the nearest QRT to the ATM cluster and notify nodal bank coordinators.",
    "HIGH": "Request bank lien marking on beneficiary accounts and put the zone's ATMs under watch.",
    "MEDIUM": "Flag for the next patrol briefing and enable automated CCTV triggers.",
}


def _build_live_alerts(db: Session, limit: int = 4) -> List[AlertItem]:
    """
    Derives the alert feed from live model output.

    Previously this returned three fixed dictionaries with timestamps like
    "10 mins ago" that never changed. Now the highest-risk zones are scored at
    the current hour and the top results become the feed, so the panel responds
    to the time of day, to the seeded data, and to the operator's thresholds.
    """
    row = get_settings_row(db)
    if not row.alerts_enabled:
        return []

    severity_floor = {"MEDIUM": 0, "HIGH": 1, "CRITICAL": 2}[row.alert_min_severity]
    severity_rank = {"LOW": -1, "MEDIUM": 0, "HIGH": 1, "CRITICAL": 2}
    thresholds = get_thresholds(db)

    now = datetime.now(timezone.utc)
    hour, dow = now.hour, now.weekday()

    # Only the busiest zones are worth scoring for a summary panel.
    candidates = (
        db.query(Area)
        .order_by(Area.baseline_risk_score.desc())
        .limit(25)
        .all()
    )

    try:
        # One vectorised pass over the candidates, then per-prediction
        # attribution for the handful that actually make the feed. Explaining
        # all 25 up front cost nine model calls each for results nobody sees.
        batch = predict_areas_batch(candidates, hour, dow, thresholds)
    except FileNotFoundError:
        return []

    eligible = [b for b in batch if severity_rank[b["risk_level"]] >= severity_floor]
    eligible.sort(key=lambda b: b["risk_score"], reverse=True)

    scored = []
    for b in eligible[:limit]:
        area = b["area"]
        detail = predict_cash_withdrawal_risk(
            hour=hour,
            day_of_week=dow,
            previous_incident_count=int(area.baseline_risk_score * 15),
            area_atm_density=area.atm_pos_density,
            time_to_report_mins=120,
            transaction_amount=35000.0,
            transaction_type="UPI_FRAUD",
            complaint_category="INVESTMENT_MULE_SCAM",
            area_baseline_risk_score=area.baseline_risk_score,
            thresholds=thresholds
        )
        top_factor = detail["contributing_factors"][0] if detail["contributing_factors"] else None
        scored.append(AlertItem(
            id=f"ALT-{area.area_id}",
            area_id=area.area_id,
            area_name=area.area_name,
            timestamp=now.strftime("%Y-%m-%d %H:%M UTC"),
            severity=b["risk_level"],
            message=(
                f"{b['risk_percentage']}% cash-out probability at {hour:02d}:00 "
                f"across {area.atm_pos_density} cash terminals."
                + (f" Largest single factor: {top_factor['factor']} ({top_factor['impact']})."
                   if top_factor else "")
            ),
            risk_score=b["risk_score"],
            recommended_action=ACTION_BY_SEVERITY.get(
                b["risk_level"], "Continue routine surveillance.")
        ))

    return scored


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    National command metrics, risk distribution and the live alert feed.

    Every figure below is computed from the database. There are no substitute
    literals: an unseeded database returns 409 with instructions rather than
    inventing counts that contradict what the risk map reads from disk.
    """
    total_complaints = db.query(Complaint).count()
    total_areas = db.query(Area).count()

    if total_areas == 0:
        raise HTTPException(
            status_code=409,
            detail="Database not seeded. Run: python database/seed_data.py"
        )

    total_cash_outs = db.query(Complaint).filter(
        Complaint.target_cash_withdrawal_event == 1).count()

    counts = dict(
        db.query(Area.risk_category, func.count(Area.area_id))
        .group_by(Area.risk_category)
        .all()
    )
    high_count = counts.get("HIGH", 0)
    med_count = counts.get("MEDIUM", 0)
    low_count = counts.get("LOW", 0)

    total_amount = db.query(func.sum(Complaint.transaction_amount)).scalar() or 0.0

    # Top high-risk areas, with their complaint counts resolved in one grouped
    # query rather than one query per area.
    top_areas = (
        db.query(Area)
        .filter(Area.risk_category == "HIGH")
        .order_by(Area.baseline_risk_score.desc())
        .limit(6)
        .all()
    )
    top_ids = [a.area_id for a in top_areas]
    complaint_counts = dict(
        db.query(Complaint.area_id, func.count(Complaint.id))
        .filter(Complaint.area_id.in_(top_ids))
        .group_by(Complaint.area_id)
        .all()
    ) if top_ids else {}

    top_areas_list = [{
        "area_id": a.area_id,
        "area_name": a.area_name,
        "state": a.state,
        "risk_category": a.risk_category,
        "baseline_risk_score": a.baseline_risk_score,
        "atm_pos_density": a.atm_pos_density,
        "complaint_count": complaint_counts.get(a.area_id, 0),
        "latitude": a.latitude,
        "longitude": a.longitude,
    } for a in top_areas]

    # Model scorecard from the training artifacts.
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    f1_val, acc_val = 0.0, 0.0
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                m = json.load(f).get("selected_model_metrics", {})
                f1_val = m.get("f1_score", 0.0)
                acc_val = m.get("accuracy", 0.0)
        except (json.JSONDecodeError, OSError):
            pass

    # Hourly curve from the EDA pass.
    eda_json = os.path.join(os.path.dirname(settings.MODEL_DIR), "..", "data", "eda_summary.json")
    hourly_data = []
    if os.path.exists(eda_json):
        try:
            with open(eda_json, "r", encoding="utf-8") as f:
                hourly_data = json.load(f).get("hourly_trends", [])
        except (json.JSONDecodeError, OSError):
            pass

    alerts = _build_live_alerts(db)

    return DashboardSummaryResponse(
        total_complaints=total_complaints,
        total_cash_withdrawal_events=total_cash_outs,
        high_risk_areas_count=high_count,
        medium_risk_areas_count=med_count,
        low_risk_areas_count=low_count,
        active_alerts_count=len(alerts),
        model_f1_score=f1_val,
        model_accuracy=acc_val,
        total_fraud_volume_inr=float(total_amount),
        top_high_risk_areas=top_areas_list,
        recent_alerts=alerts,
        hourly_distribution=hourly_data
    )
