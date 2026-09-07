from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User
from backend.app.core.rbac import require_roles
from backend.app.schemas.audit_schema import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit & Compliance"])

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action keyword"),
    actor_email: Optional[str] = Query(None, description="Filter by officer email"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "investigator"]))
):
    """
    Returns the audit trail of authentications, predictions and configuration changes.

    Append-only in the sense that the API exposes no delete or update path — not
    cryptographically tamper-evident. Say "append-only", not "immutable".
    """
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    
    if action:
        query = query.filter(AuditLog.action.contains(action.upper()))
    if actor_email:
        query = query.filter(AuditLog.actor_email == actor_email)

    logs = query.limit(limit).all()

    return [
        AuditLogResponse(
            id=l.id,
            timestamp=l.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            actor_email=l.actor_email,
            actor_role=l.actor_role,
            action=l.action,
            resource=l.resource,
            details=l.details or "",
            ip_address=l.ip_address
        )
        for l in logs
    ]
