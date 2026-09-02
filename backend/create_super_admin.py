from app.database.session import SessionLocal
from app.database import models
from app.core import auth

def create_super_admin():
    db = SessionLocal()
    
    # Check if already exists
    existing = db.query(models.User).filter(models.User.email == "admin@ai-receptionist.com").first()
    if existing:
        print("Super admin already exists!")
        return

    admin_user = models.User(
        username="admin@ai-receptionist.com",
        email="admin@ai-receptionist.com",
        hashed_password=auth.get_password_hash("SuperAdmin123!"),
        is_active=True,
        is_admin=True,
        is_super_admin=True,
        organization_id=None # Super admins don't need a specific clinic organization
    )
    
    db.add(admin_user)
    db.commit()
    print("Super admin created successfully!")
    db.close()

if __name__ == "__main__":
    create_super_admin()
