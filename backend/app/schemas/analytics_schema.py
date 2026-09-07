from typing import List, Dict, Any
from pydantic import BaseModel

class AnalyticsTrendsResponse(BaseModel):
    hourly_trends: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]
    transaction_type_breakdown: List[Dict[str, Any]]
    regional_risk_matrix: List[Dict[str, Any]]
    amount_bucket_distribution: List[Dict[str, Any]]
    model_performance_summary: Dict[str, Any]

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    actor_email: str
    actor_role: str
    action: str
    resource: str
    details: str
    ip_address: str
