from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.system_setting import SystemSetting
from backend.app.models.user import User
from backend.app.core.rbac import get_current_user, require_roles
from backend.app.core.audit_logger import log_audit_event
from backend.app.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["System Controls"])


class SettingsResponse(BaseModel):
    threshold_critical: float
    threshold_high: float
    threshold_medium: float
    alerts_enabled: bool
    alert_min_severity: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class SettingsUpdate(BaseModel):
    threshold_critical: Optional[float] = Field(None, ge=0.0, le=1.0)
    threshold_high: Optional[float] = Field(None, ge=0.0, le=1.0)
    threshold_medium: Optional[float] = Field(None, ge=0.0, le=1.0)
    alerts_enabled: Optional[bool] = None
    alert_min_severity: Optional[str] = Field(None, pattern="^(MEDIUM|HIGH|CRITICAL)$")


def get_settings_row(db: Session) -> SystemSetting:
    """Returns the live settings row, creating it from config defaults if absent."""
    row = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if not row:
        row = SystemSetting(
            id=1,
            threshold_critical=app_settings.RISK_THRESHOLD_CRITICAL,
            threshold_high=app_settings.RISK_THRESHOLD_HIGH,
            threshold_medium=app_settings.RISK_THRESHOLD_MEDIUM,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_thresholds(db: Session) -> dict:
    """Threshold dict in the shape ml.pipeline.predict expects."""
    row = get_settings_row(db)
    return {
        "critical": row.threshold_critical,
        "high": row.threshold_high,
        "medium": row.threshold_medium,
    }


def _serialise(row: SystemSetting) -> SettingsResponse:
    return SettingsResponse(
        threshold_critical=row.threshold_critical,
        threshold_high=row.threshold_high,
        threshold_medium=row.threshold_medium,
        alerts_enabled=bool(row.alerts_enabled),
        alert_min_severity=row.alert_min_severity,
        updated_at=row.updated_at.strftime("%Y-%m-%d %H:%M:%S UTC") if row.updated_at else None,
        updated_by=row.updated_by,
    )


@router.get("", response_model=SettingsResponse)
def read_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the live risk cut-offs and alert configuration."""
    return _serialise(get_settings_row(db))


@router.patch("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """
    Updates the live risk cut-offs. Admin only, and every change is written to
    the audit ledger with the previous and new values — changing how the system
    classifies risk is exactly the kind of action an audit trail exists for.
    """
    row = get_settings_row(db)
    before = {
        "critical": row.threshold_critical,
        "high": row.threshold_high,
        "medium": row.threshold_medium,
        "alerts_enabled": bool(row.alerts_enabled),
        "alert_min_severity": row.alert_min_severity,
    }

    if payload.threshold_critical is not None:
        row.threshold_critical = payload.threshold_critical
    if payload.threshold_high is not None:
        row.threshold_high = payload.threshold_high
    if payload.threshold_medium is not None:
        row.threshold_medium = payload.threshold_medium
    if payload.alerts_enabled is not None:
        row.alerts_enabled = 1 if payload.alerts_enabled else 0
    if payload.alert_min_severity is not None:
        row.alert_min_severity = payload.alert_min_severity

    if not (row.threshold_medium < row.threshold_high < row.threshold_critical):
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Thresholds must increase: medium < high < critical. "
                   f"Got medium={row.threshold_medium}, high={row.threshold_high}, "
                   f"critical={row.threshold_critical}.",
        )

    row.updated_by = current_user.email
    db.commit()
    db.refresh(row)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="RISK_THRESHOLDS_UPDATED",
        resource="/settings",
        details={"before": before, "after": {
            "critical": row.threshold_critical,
            "high": row.threshold_high,
            "medium": row.threshold_medium,
            "alerts_enabled": bool(row.alerts_enabled),
            "alert_min_severity": row.alert_min_severity,
        }},
        ip_address=request.client.host if request.client else "127.0.0.1",
    )

    return _serialise(row)
