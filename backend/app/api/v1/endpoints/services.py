from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user

router = APIRouter()

class ServiceBase(BaseModel):
    name: str
    duration_minutes: int
    buffer_minutes: int = 0
    price: float = 0.0

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Service).filter(
        models.Service.organization_id == current_user.organization_id,
        models.Service.is_deleted == False
    ).all()

@router.post("/", response_model=ServiceResponse)
def create_service(service: ServiceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_service = models.Service(
        organization_id=current_user.organization_id,
        name=service.name,
        duration_minutes=service.duration_minutes,
        buffer_minutes=service.buffer_minutes,
        price=service.price
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@router.delete("/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.organization_id == current_user.organization_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.is_deleted = True
    db.commit()
    return {"status": "success"}
