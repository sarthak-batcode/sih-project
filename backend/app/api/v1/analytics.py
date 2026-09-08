import os
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from backend.app.database import get_db
from backend.app.models.area import Area
from backend.app.models.complaint import Complaint
from backend.app.schemas.analytics_schema import AnalyticsTrendsResponse
from backend.app.config import settings

router = APIRouter(prefix="/analytics", tags=["Analytics & Trends"])

AMOUNT_BUCKET_LABELS = {
    "LOW_UNDER_10K": "< ₹10,000",
    "MID_10K_TO_50K": "₹10,000 – ₹50,000",
    "HIGH_50K_TO_200K": "₹50,000 – ₹200,000",
    "CRITICAL_ABOVE_200K": "> ₹200,000",
}
BUCKET_ORDER = list(AMOUNT_BUCKET_LABELS.keys())


def _regional_matrix(db: Session):
    """
    Risk, volume and cash-out rate per region.

    This was previously a list of five hand-written dictionaries. The numbers
    are all derivable — one join and one GROUP BY — so they are derived.
    """
    rows = (
        db.query(
            Area.region.label("region"),
            func.avg(Area.baseline_risk_score).label("avg_risk"),
            func.count(Complaint.id).label("complaints"),
            func.sum(Complaint.target_cash_withdrawal_event).label("cash_outs"),
            func.avg(Area.atm_pos_density).label("atm_density_avg")
        )
        .outerjoin(Complaint, Complaint.area_id == Area.area_id)
        .group_by(Area.region)
        .order_by(func.avg(Area.baseline_risk_score).desc())
        .all()
    )
    return [{
        "region": r.region,
        "avg_risk": round(float(r.avg_risk or 0), 3),
        "complaints": int(r.complaints or 0),
        "cash_outs": int(r.cash_outs or 0),
        "atm_density_avg": round(float(r.atm_density_avg or 0), 1),
    } for r in rows]


def _amount_buckets(db: Session):
    """Complaint count and cash-out rate per transaction-amount band."""
    rows = (
        db.query(
            Complaint.transaction_amount_bucket.label("bucket"),
            func.count(Complaint.id).label("count"),
            func.sum(Complaint.target_cash_withdrawal_event).label("cash_outs")
        )
        .group_by(Complaint.transaction_amount_bucket)
        .all()
    )
    by_bucket = {r.bucket: r for r in rows}
    out = []
    for bucket in BUCKET_ORDER:
        r = by_bucket.get(bucket)
        if not r or not r.count:
            continue
        out.append({
            "bucket": bucket,
            "label": AMOUNT_BUCKET_LABELS[bucket],
            "count": int(r.count),
            "cash_out_rate": round(100.0 * float(r.cash_outs or 0) / float(r.count), 1),
        })
    return out


def _from_eda(key: str):
    path = os.path.join(os.path.dirname(settings.MODEL_DIR), "..", "data", "eda_summary.json")
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get(key, [])
    except (json.JSONDecodeError, OSError):
        return []


@router.get("/trends", response_model=AnalyticsTrendsResponse)
def get_analytics_trends(db: Session = Depends(get_db)):
    """Temporal curves from the EDA pass, plus regional and amount aggregates computed live."""
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    model_summary = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                model_summary = json.load(f).get("selected_model_metrics", {})
        except (json.JSONDecodeError, OSError):
            pass

    return AnalyticsTrendsResponse(
        hourly_trends=_from_eda("hourly_trends"),
        category_breakdown=_from_eda("category_breakdown"),
        transaction_type_breakdown=_from_eda("transaction_type_breakdown"),
        regional_risk_matrix=_regional_matrix(db),
        amount_bucket_distribution=_amount_buckets(db),
        model_performance_summary=model_summary
    )
