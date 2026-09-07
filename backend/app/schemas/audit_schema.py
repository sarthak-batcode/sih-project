from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    actor_email: str
    actor_role: str
    action: str
    resource: str
    details: str
    ip_address: str
