from typing import List, Optional
from pydantic import BaseModel

class AreaQuickStats(BaseModel):
    area_id: str
    area_name: str
    state: str
    risk_category: str
    baseline_risk_score: float
    atm_pos_density: int
    complaint_count: int

class AlertItem(BaseModel):
    id: str
    area_id: str
    area_name: str
    timestamp: str
    severity: str
    message: str
    risk_score: float
    recommended_action: str

class DashboardSummaryResponse(BaseModel):
    total_complaints: int
    total_cash_withdrawal_events: int
    high_risk_areas_count: int
    medium_risk_areas_count: int
    low_risk_areas_count: int
    active_alerts_count: int
    model_f1_score: float
    model_accuracy: float
    total_fraud_volume_inr: float
    top_high_risk_areas: List[dict]
    recent_alerts: List[AlertItem]
    hourly_distribution: List[dict]
