from typing import List, Optional
from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    area_id: str = Field(..., description="Surveillance area ID, e.g. AREA-CA-101")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    previous_incident_count: int = Field(10, ge=0, description="Rolling count of recent incidents")
    area_atm_density: Optional[int] = Field(None, description="ATM point density")
    time_to_report_mins: int = Field(120, ge=1, description="Reporting latency in minutes")
    transaction_amount: float = Field(35000.0, gt=0, description="Defrauded transaction amount INR")
    transaction_type: str = Field("UPI_FRAUD", description="Payment channel modality")
    complaint_category: str = Field("INVESTMENT_MULE_SCAM", description="Scam category")
    # Derived server-side from transaction_amount. Accepted for backwards
    # compatibility but ignored — the two can otherwise contradict each other.
    transaction_amount_bucket: Optional[str] = Field(
        None, deprecated=True,
        description="Ignored. The amount band is derived from transaction_amount.")

class ContributingFactor(BaseModel):
    factor: str
    # Signed percentage-point change in the predicted probability, produced by
    # re-scoring this case with the factor held at its training-set baseline.
    impact: str
    impact_value: float = 0.0
    severity: str
    direction: str = "neutral"
    description: str

class PredictionResponse(BaseModel):
    area_id: str
    area_name: str
    risk_score: float
    risk_percentage: float
    risk_level: str
    confidence_interval: List[float]
    recommended_action: str
    recommended_patrol_window: str
    contributing_factors: List[ContributingFactor]
    attribution_method: Optional[str] = None
    thresholds_applied: Optional[dict] = None
    model_version: str
    algorithm: str
    disclaimer: str

class BatchPredictionItem(BaseModel):
    area_id: str
    area_name: str
    state: str
    latitude: float
    longitude: float
    risk_score: float
    risk_level: str
    atm_pos_density: int
    recommended_patrol_window: str
    active_surveillance: bool

class BatchPredictionResponse(BaseModel):
    total_evaluated_areas: int
    critical_risk_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    generated_at: str
    results: List[BatchPredictionItem]
