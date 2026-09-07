from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime
from backend.app.database import Base


class SystemSetting(Base):
    """
    Operator-configurable runtime settings.

    A single row (id=1) holds the live configuration. The risk cut-offs here are
    read by the prediction endpoints on every request, so moving a threshold in
    the Settings screen immediately changes how zones are classified — the
    controls are wired to the model rather than to local component state.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)

    threshold_critical = Column(Float, nullable=False, default=0.80)
    threshold_high = Column(Float, nullable=False, default=0.65)
    threshold_medium = Column(Float, nullable=False, default=0.40)

    alerts_enabled = Column(Integer, nullable=False, default=1)
    alert_min_severity = Column(String, nullable=False, default="HIGH")

    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    updated_by = Column(String, nullable=True)
