import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    actor_email = Column(String, nullable=False, index=True)
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)  # PREDICTION_GENERATED, RISK_THRESHOLDS_UPDATED, SYSTEM_INIT_SEED, etc.
    resource = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String, default="127.0.0.1")
