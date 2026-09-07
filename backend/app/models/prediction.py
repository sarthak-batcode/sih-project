import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text
from backend.app.database import Base

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    area_id = Column(String, nullable=False, index=True)
    area_name = Column(String, nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    confidence_interval_low = Column(Float, nullable=False)
    confidence_interval_high = Column(Float, nullable=False)
    recommended_action = Column(Text, nullable=False)
    recommended_patrol_window = Column(String, nullable=False)
    contributing_factors_json = Column(Text, nullable=False)  # JSON string
    model_version = Column(String, nullable=False)
    created_by_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
