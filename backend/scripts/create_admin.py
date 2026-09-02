from app.database.session import SessionLocal
from app.database import models
from app.core import auth
import sys

def create_admin(username, password, email):
    db = SessionLocal()
    
    # Check if user exists
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        print(f"User {username} already exists!")
        db.close()
        return

    hashed_pw = auth.get_password_hash(password)
    user = models.User(
        username=username,
        email=email,
        hashed_password=hashed_pw,
        is_admin=True
    )
    db.add(user)
    db.commit()
    print(f"Admin user '{username}' created successfully!")
    db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password> <email>")
    else:
        create_admin(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else f"{sys.argv[1]}@clinic.com")
