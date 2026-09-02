import sys
import json
from app.database.session import SessionLocal
from app.database import models
from provision_vapi_assistant import provision_assistant, import_twilio_number
from app.core.config import settings

def onboard_new_clinic(data):
    db = SessionLocal()
    try:
        print(f"--- Onboarding Clinic: {data['name']} ---")
        
        # 1. Create Clinic in DB
        clinic = models.Clinic(
            name=data['name'],
            address=data['address'],
            phone=data['phone'],
            google_calendar_id=data.get('calendar_id')
        )
        db.add(clinic)
        db.flush() # Get the ID
        
        # 2. Add Providers
        for p_name in data.get('providers', []):
            provider = models.Provider(clinic_id=clinic.id, name=p_name, specialty="General Dentistry")
            db.add(provider)
        
        # 3. Add Services
        for s in data.get('services', []):
            service = models.Service(clinic_id=clinic.id, name=s['name'], duration_minutes=s['duration'])
            db.add(service)
            
        # 4. Add FAQs
        for key, ans in data.get('faqs', {}).items():
            faq = models.ClinicFAQ(clinic_id=clinic.id, question_key=key, answer=ans)
            db.add(faq)
            
        db.commit()
        print(f"Successfully added to Database (ID: {clinic.id})")

        # 5. Provision Vapi Assistant
        if data.get('vapi_key') and data.get('public_url'):
            print("Provisioning Vapi Assistant...")
            assistant_id = provision_assistant(data['vapi_key'], data['public_url'])
            if assistant_id and data.get('twilio_number'):
                # Update settings temporarily for the script to use the right Twilio number
                settings.TWILIO_PHONE_NUMBER = data['twilio_number']
                import_twilio_number(data['vapi_key'], assistant_id)
            print(f"Assistant setup complete for {data['name']}!")
        
        print("\n--- ONBOARDING COMPLETE ---")
        return clinic.id

    except Exception as e:
        print(f"ERROR during onboarding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Example usage via JSON file or CLI
    # For now, let's make it a simple interactive or file-based trigger
    print("Dental AI Onboarding Tool v1.0")
    print("Please provide a JSON file with clinic details.")
    print("Example: python onboard_clinic.py clinic_data.json")
    
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            onboard_data = json.load(f)
            onboard_new_clinic(onboard_data)
