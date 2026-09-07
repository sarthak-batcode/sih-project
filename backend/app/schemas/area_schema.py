from typing import List, Optional
from pydantic import BaseModel

class AreaSchema(BaseModel):
    area_id: str
    area_name: str
    district: str
    state: str
    region: str
    zone_type: str
    latitude: float
    longitude: float
    radius_km: float
    atm_pos_density: int
    baseline_risk_score: float
    risk_category: str
    active_surveillance: bool

class AreaDetailResponse(BaseModel):
    area: AreaSchema
    recent_incidents: List[dict]
    hourly_breakdown: List[dict]
    modality_breakdown: List[dict]
    calculated_threat_index: float
    recommended_patrol_window: str
