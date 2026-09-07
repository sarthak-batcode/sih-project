import os
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.area import Area
from backend.app.models.complaint import Complaint
from backend.app.core.rbac import get_current_user
from backend.app.models.user import User
from backend.app.schemas.area_schema import AreaSchema, AreaDetailResponse

router = APIRouter(prefix="/areas", tags=["Surveillance Areas"])

@router.get("", response_model=List[AreaSchema])
def list_areas(
    risk_category: Optional[str] = Query(None, description="Filter by HIGH, MEDIUM, LOW"),
    state: Optional[str] = Query(None, description="Filter by state"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all 100 surveillance grid areas with coordinates and threat scores."""
    query = db.query(Area)
    if risk_category:
        query = query.filter(Area.risk_category == risk_category.upper())
    if state:
        query = query.filter(Area.state == state)
        
    areas = query.all()
    
    # Fallback to synthetic_areas.json if db not populated
    if not areas:
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "synthetic_areas.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if risk_category:
                    data = [a for a in data if a["risk_category"] == risk_category.upper()]
                return data

    return areas

@router.get("/{area_id}", response_model=AreaDetailResponse)
def get_area_detail(area_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches deep intelligence profile for a specific surveillance area."""
    area = db.query(Area).filter(Area.area_id == area_id).first()
    if not area:
        # Check json fallback
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "synthetic_areas.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                match = next((a for a in data if a["area_id"] == area_id), None)
                if match:
                    area = Area(**match)
        if not area:
            raise HTTPException(status_code=404, detail=f"Surveillance Area {area_id} not found")

    recent_complaints = (
        db.query(Complaint)
        .filter(Complaint.area_id == area_id)
        .order_by(Complaint.timestamp.desc())
        .limit(10)
        .all()
    )

    incidents_list = []
    for c in recent_complaints:
        incidents_list.append({
            "complaint_id": c.complaint_id,
            "timestamp": c.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "transaction_type": c.transaction_type,
            "complaint_category": c.complaint_category,
            "transaction_amount": c.transaction_amount,
            "is_cash_withdrawal": bool(c.target_cash_withdrawal_event)
        })

    # Patrol window
    patrol_window = "21:00 - 02:00 IST (Night Window)" if area.baseline_risk_score >= 0.60 else "12:00 - 18:00 IST (Day Window)"

    return AreaDetailResponse(
        area=AreaSchema(
            area_id=area.area_id,
            area_name=area.area_name,
            district=area.district,
            state=area.state,
            region=area.region,
            zone_type=area.zone_type,
            latitude=area.latitude,
            longitude=area.longitude,
            radius_km=area.radius_km,
            atm_pos_density=area.atm_pos_density,
            baseline_risk_score=area.baseline_risk_score,
            risk_category=area.risk_category,
            active_surveillance=area.active_surveillance
        ),
        recent_incidents=incidents_list,
        hourly_breakdown=[
            {"hour_window": "00:00 - 06:00", "risk_index": round(area.baseline_risk_score * 1.3, 2)},
            {"hour_window": "06:00 - 12:00", "risk_index": round(area.baseline_risk_score * 0.7, 2)},
            {"hour_window": "12:00 - 18:00", "risk_index": round(area.baseline_risk_score * 0.9, 2)},
            {"hour_window": "18:00 - 24:00", "risk_index": round(area.baseline_risk_score * 1.4, 2)},
        ],
        modality_breakdown=[
            {"type": "UPI_FRAUD", "percentage": 42},
            {"type": "AEPS_SPOOF", "percentage": 28},
            {"type": "SIM_CLONE", "percentage": 18},
            {"type": "CARD_SKIMMING", "percentage": 12},
        ],
        calculated_threat_index=area.baseline_risk_score,
        recommended_patrol_window=patrol_window
    )
