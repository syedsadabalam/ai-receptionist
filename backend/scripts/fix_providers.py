from app.database.session import SessionLocal
from app.database import models

def refresh_team():
    db = SessionLocal()
    try:
        # 1. Clear existing providers and their appointments (to keep it clean)
        db.query(models.Appointment).delete()
        db.query(models.Provider).delete()
        db.commit()
        
        # 2. Get the clinic ID
        clinic = db.query(models.Clinic).first()
        if not clinic:
            print("No clinic found. Please run seed.py first.")
            return

        # 3. Add a diverse medical team
        team = [
            {"name": "Dr. Sarah Wilson", "specialty": "Orthodontist"},
            {"name": "Dr. Michael Chen", "specialty": "Oral Surgeon"},
            {"name": "Dr. Elena Rodriguez", "specialty": "Pediatric Dentist"},
            {"name": "Dr. James Smith", "specialty": "General Dentistry"}
        ]
        
        for member in team:
            provider = models.Provider(
                clinic_id=clinic.id,
                name=member["name"],
                specialty=member["specialty"]
            )
            db.add(provider)
        
        db.commit()
        print(f"Successfully refreshed the medical team for {clinic.name}!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    refresh_team()
