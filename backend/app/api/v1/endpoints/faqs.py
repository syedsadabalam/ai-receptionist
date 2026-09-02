from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user

router = APIRouter()

class FAQBase(BaseModel):
    question_key: str
    answer: str

class FAQCreate(FAQBase):
    pass

class FAQResponse(FAQBase):
    id: int
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[FAQResponse])
def get_faqs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.OrganizationFAQ).filter(
        models.OrganizationFAQ.organization_id == current_user.organization_id,
        models.OrganizationFAQ.is_deleted == False
    ).all()

@router.post("/", response_model=FAQResponse)
def create_faq(faq: FAQCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_faq = models.OrganizationFAQ(
        organization_id=current_user.organization_id,
        question_key=faq.question_key,
        answer=faq.answer
    )
    db.add(db_faq)
    db.commit()
    db.refresh(db_faq)
    return db_faq

@router.delete("/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    faq = db.query(models.OrganizationFAQ).filter(
        models.OrganizationFAQ.id == faq_id,
        models.OrganizationFAQ.organization_id == current_user.organization_id
    ).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    faq.is_deleted = True
    db.commit()
    return {"status": "success"}
