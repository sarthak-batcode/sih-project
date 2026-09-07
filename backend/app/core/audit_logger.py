import json
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog

def log_audit_event(
    db: Session,
    actor_email: str,
    actor_role: str,
    action: str,
    resource: str,
    details: dict = None,
    ip_address: str = "127.0.0.1"
) -> AuditLog:
    """Helper to persist audit events for compliance & SIH human-in-the-loop audit trails."""
    details_str = json.dumps(details) if isinstance(details, (dict, list)) else str(details or "")
    log_entry = AuditLog(
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        resource=resource,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
