import json
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog

# The site is public, so there is no signed-in officer to attribute an action to.
# The ledger still records WHAT happened and WHEN, which is what the Audit log
# screen shows; only the WHO is now a fixed placeholder.
PUBLIC_ACTOR_EMAIL = "public@cyberintel.gov.in"
PUBLIC_ACTOR_ROLE = "public"


def log_audit_event(
    db: Session,
    action: str,
    resource: str,
    details: dict = None,
    ip_address: str = "127.0.0.1",
    actor_email: str = PUBLIC_ACTOR_EMAIL,
    actor_role: str = PUBLIC_ACTOR_ROLE,
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
