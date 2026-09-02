from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database import models
from app.core import auth
from app.core.limiter import limiter
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_super_admin: bool = False

class OrganizationRegistrationRequest(BaseModel):
    organization_name: str
    industry: str
    email: str
    password: str
    phone: str

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token — embed role and org so the frontend can read them from the JWT
    access_token = auth.create_access_token(data={
        "sub": user.username,
        "is_super_admin": user.is_super_admin,
        "organization_id": user.organization_id,
    })
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "is_super_admin": user.is_super_admin,
    }

@router.post("/register")
@limiter.limit("3/hour")
def register(request: Request, data: OrganizationRegistrationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user email already exists
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    existing_username = db.query(models.User).filter(models.User.username == data.email).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create Organization
    new_org = models.Organization(
        name=data.organization_name,
        industry=data.industry,
        phone=data.phone,
        # Default open/close times
        open_time="09:00",
        close_time="17:00"
    )
    db.add(new_org)
    db.flush() # get ID

    # Create User (Admin)
    new_user = models.User(
        username=data.email, # using email as username
        email=data.email,
        hashed_password=auth.get_password_hash(data.password),
        is_active=True,
        is_admin=True,
        organization_id=new_org.id
    )
    db.add(new_user)
    
    # Add default Provider and Service
    default_provider = models.Provider(organization_id=new_org.id, name="Default Provider", specialty="General")
    default_service = models.Service(organization_id=new_org.id, name="Initial Consultation", duration_minutes=30)
    db.add(default_provider)
    db.add(default_service)
    
    db.commit()

    # Queue background task for provisioning
    from app.workers.provisioning import provision_ai_assistant
    background_tasks.add_task(provision_ai_assistant, new_org.id)

    return {"message": "Registration successful. Provisioning AI assistant in the background.", "organization_id": new_org.id}
