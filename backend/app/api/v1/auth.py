from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.audit_logger import log_audit_event
from backend.app.core.rbac import get_current_user
from backend.app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates user with email and password, returning JWT bearer token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token = create_access_token(subject=user.email, role=user.role)
    
    # Audit log event
    log_audit_event(
        db=db,
        actor_email=user.email,
        actor_role=user.role,
        action="LOGIN_SUCCESS",
        resource="/auth/login",
        details={"email": user.email, "role": user.role},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    )

@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Registers a new officer/analyst account (Admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can provision new user credentials."
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )

    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="USER_PROVISIONED",
        resource=f"/users/{new_user.id}",
        details={"created_email": new_user.email, "role": new_user.role}
    )

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active
    )
