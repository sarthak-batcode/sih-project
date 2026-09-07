from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.user import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Extracts and verifies JWT token from Authorization header, returns authenticated User."""
    if not credentials:
        # No silent fallback. An earlier version returned the demo admin when the
        # Authorization header was absent, which made every protected endpoint
        # answer an unauthenticated curl with full admin rights.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired JWT Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload["sub"]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated User no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user

def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control dependency.

    `admin` is a deliberate superuser: it satisfies every role check, so an
    Inspector General account does not need to be listed on each endpoint. That
    is intentional, not a bypass — but it does mean the demo admin sees
    everything, so demonstrate RBAC with the analyst account.
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} role permissions."
            )
        return current_user
    return role_checker
