from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine
from app.database import models

def seed():
    db = SessionLocal()
    try:
        # Create a clinic
        clinic = models.Clinic(
            name="Maple Dental Clinic",
            address="123 Maple St, Toronto, ON",
            phone="416-555-0199",
            google_calendar_id="4fd17f714e1aaaf1d477e7ca00923cf64d6fd120691e95327c9369d3d6d0cfb8@group.calendar.google.com"
        )
        db.add(clinic)
        db.flush()

        # Create a provider
        provider = models.Provider(
            clinic_id=clinic.id,
            name="Dr. Smith",
            specialty="General Dentistry"
        )
        db.add(provider)
        db.flush()

        # Create a service
        service = models.Service(
            clinic_id=clinic.id,
            name="Cleaning",
            duration_minutes=60
        )
        db.add(service)
        
        db.commit()
        
        # Add FAQs
        faqs = [
            models.ClinicFAQ(clinic_id=clinic.id, question_key="parking", answer="We have free parking behind the building. The entrance is via Maple lane."),
            models.ClinicFAQ(clinic_id=clinic.id, question_key="insurance", answer="We accept most major providers including Blue Cross and Sun Life. We can also direct bill most plans."),
            models.ClinicFAQ(clinic_id=clinic.id, question_key="address", answer="We are located at 123 Maple St, Toronto, right next to the Starbucks.")
        ]
        db.add_all(faqs)
        db.commit()

        print("Database seeded successfully!")
        print(f"Clinic ID: {clinic.id}")
        print(f"Provider ID: {provider.id}")
        print(f"Service ID: {service.id}")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Note: This requires the tables to be created first.
    # You can run this after 'alembic upgrade head'
    seed()
