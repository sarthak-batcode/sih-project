import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from backend.app.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    area_id = Column(String, ForeignKey("areas.area_id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)
    complaint_category = Column(String, nullable=False)
    transaction_amount = Column(Float, nullable=False)
    transaction_amount_bucket = Column(String, nullable=False)
    time_to_report_mins = Column(Integer, nullable=False)
    hour = Column(Integer, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    is_weekend = Column(Integer, default=0)
    is_night_window = Column(Integer, default=0)
    previous_incident_count = Column(Integer, default=0)
    area_atm_density = Column(Integer, default=20)
    # Area attribute, known before the incident. Safe to use as a model feature.
    area_baseline_risk_score = Column(Float, default=0.4)
    # The probability the synthetic label was drawn from. Stored for auditability
    # of the data-generating process ONLY - never a model feature. See the
    # feature contract in ml/pipeline/train.py.
    label_generation_prob = Column(Float, default=0.5)
    target_cash_withdrawal_event = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
