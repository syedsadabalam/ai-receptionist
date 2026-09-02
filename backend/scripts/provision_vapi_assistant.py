import requests
import json
from app.core.config import settings
from app.ai.prompts import get_receptionist_prompt

VAPI_BASE_URL = "https://api.vapi.ai"

def provision_assistant(vapi_key, public_url, organization_id=1):
    from app.database.session import SessionLocal
    from app.database import models
    
    db = SessionLocal()
    organization = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
    services = db.query(models.Service).filter(models.Service.organization_id == organization_id).all()
    providers = db.query(models.Provider).filter(models.Provider.organization_id == organization_id).all()
    
    services_text = "\n".join([f"- {s.name} ({s.duration_minutes} min) - ${s.price:.2f}" for s in services])
    providers_text = "\n".join([f"- {p.name} ({p.specialty})" for p in providers])
    
    clinic_name = organization.name if organization else "Dental Clinic"
    clinic_address = organization.address if organization else "Clinic Address"
    clinic_timezone = organization.timezone if organization else "UTC"
    clinic_custom_prompt = organization.custom_prompt if organization else None
    db.close()

    headers = {
        "Authorization": f"Bearer {vapi_key}",
        "Content-Type": "application/json"
    }

    # Generate the system prompt with localized data, team info, and custom instructions
    prompt = get_receptionist_prompt(
        organization_name=clinic_name,
        organization_industry=organization.industry if organization else "dental",
        organization_hours=f"{organization.open_time} - {organization.close_time}" if organization else "9 AM - 5 PM",
        services_text=services_text,
        providers_text=providers_text,
        address=clinic_address,
        emergency_phone=organization.emergency_phone if organization else None,
        website=organization.website_url if organization else None,
        timezone=clinic_timezone,
        custom_prompt=clinic_custom_prompt
    )

    payload = {
        "name": f"{organization.name} Receptionist",
        "firstMessage": f"Thank you for calling {organization.name}. I am the AI Receptionist. Please note this call is recorded for quality. How can I help you today?",
        "silenceTimeoutSeconds": 5,
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2-general",
            "language": "multi",
            "smartFormat": True
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": [{"role": "system", "content": prompt}],
            "tools": [
                {
                    "type": "function",
                    "messages": [
                        {
                            "type": "request-start",
                            "content": "Let me check the schedule for you. One moment."
                        }
                    ],
                    "function": {
                        "name": "check_availability",
                        "description": "Check if a provider is available at a specific time.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "provider_id": {"type": "integer"},
                                "start_time": {"type": "string", "format": "date-time"},
                                "service_id": {"type": "integer"}
                            },
                            "required": ["provider_id", "start_time", "service_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "messages": [
                        {
                            "type": "request-start",
                            "content": "I am booking that for you now. Just a second."
                        }
                    ],
                    "function": {
                        "name": "create_appointment",
                        "description": "Create a new appointment in the system.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "organization_id": {"type": "integer"},
                                "provider_id": {"type": "integer"},
                                "service_id": {"type": "integer"},
                                "customer_name": {"type": "string"},
                                "customer_phone": {"type": "string"},
                                "start_time": {"type": "string", "format": "date-time"},
                                "notes": {"type": "string"}
                            },
                            "required": ["organization_id", "provider_id", "service_id", "customer_name", "customer_phone", "start_time"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_customer_appointments",
                        "description": "Retrieve all upcoming appointments for a customer by their phone number.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "phone_number": {"type": "string"}
                            },
                            "required": ["phone_number"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "reschedule_appointment",
                        "description": "Move an existing appointment to a new date and time.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {"type": "integer"},
                                "new_start_time": {"type": "string", "format": "date-time"}
                            },
                            "required": ["appointment_id", "new_start_time"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "cancel_appointment",
                        "description": "Cancel an existing dental appointment.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {"type": "integer"}
                            },
                            "required": ["appointment_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "messages": [
                        {
                            "type": "request-start",
                            "content": "Let me look that up for you."
                        }
                    ],
                    "function": {
                        "name": "get_organization_info",
                        "description": "Look up information about the clinic such as parking, address, insurance, and rules.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "The topic to search for, e.g., 'parking', 'insurance', 'address'"},
                                "organization_id": {"type": "integer"}
                            },
                            "required": ["query"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "transfer_call",
                        "description": "Transfer the caller to a human representative for complex issues or emergencies.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reason": {"type": "string"}
                            }
                        }
                    }
                }
            ]
        },
        "voice": {
            "provider": "11labs" if (organization and organization.vapi_voice_id and len(organization.vapi_voice_id) > 15) else "deepgram",
            "voiceId": organization.vapi_voice_id if (organization and organization.vapi_voice_id) else "asteria"
        },
        "serverUrl": f"{public_url}/api/v1/voice/vapi/webhook"
    }

    assistant_name = payload["name"]
    print(f"Checking if assistant '{assistant_name}' already exists...")
    
    existing_id = None
    try:
        list_res = requests.get(f"{VAPI_BASE_URL}/assistant", headers=headers)
        if list_res.status_code == 200:
            assistants = list_res.json()
            for ast in assistants:
                if ast.get("name") == assistant_name:
                    existing_id = ast.get("id")
                    break
    except Exception as e:
        print(f"Failed to check existing assistants: {e}")

    if existing_id:
        print(f"Assistant found (ID: {existing_id}). Updating with PATCH request to new server URL: {payload['serverUrl']}...")
        response = requests.patch(f"{VAPI_BASE_URL}/assistant/{existing_id}", json=payload, headers=headers)
        action_word = "Updated"
    else:
        print(f"Assistant not found. Creating new Assistant with POST request to server URL: {payload['serverUrl']}...")
        response = requests.post(f"{VAPI_BASE_URL}/assistant", json=payload, headers=headers)
        action_word = "Created"
    
    if response.status_code in [200, 201]:
        data = response.json()
        assistant_id = data.get('id')
        print(f"Success! Assistant {action_word}.")
        print(f"Assistant ID: {assistant_id}")
        return assistant_id
    else:
        print(f"Error ({response.status_code}): {response.text}")
        return None

def import_twilio_number(vapi_key, assistant_id):
    headers = {
        "Authorization": f"Bearer {vapi_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "provider": "twilio",
        "number": settings.TWILIO_PHONE_NUMBER,
        "twilioAccountSid": settings.TWILIO_ACCOUNT_SID,
        "twilioAuthToken": settings.TWILIO_AUTH_TOKEN,
        "assistantId": assistant_id,
        "name": "Maple Dental Main Line"
    }

    print(f"Importing Twilio number {settings.TWILIO_PHONE_NUMBER} to Vapi...")
    response = requests.post(f"{VAPI_BASE_URL}/phone-number", json=payload, headers=headers)
    
    if response.status_code in [200, 201]:
        print("Success! Twilio number imported and linked to Assistant.")
    elif response.status_code == 400 and "Existing Phone Number" in response.text:
        # Extract ID from error message or try to find it
        import re
        match = re.search(r"Existing Phone Number ([\w-]+)", response.text)
        if match:
            phone_number_id = match.group(1)
            print(f"Phone number already exists with ID {phone_number_id}. Updating linkage...")
            patch_payload = {"assistantId": assistant_id}
            patch_res = requests.patch(f"{VAPI_BASE_URL}/phone-number/{phone_number_id}", json=patch_payload, headers=headers)
            if patch_res.status_code == 200:
                print("Success! Existing phone number linked to the new Assistant ID.")
            else:
                print(f"Failed to update existing phone number: {patch_res.status_code}")
        else:
            print("Could not extract phone number ID from error message.")
    else:
        print(f"Error importing phone number: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python provision_vapi_assistant.py <VAPI_API_KEY> <PUBLIC_TUNNEL_URL>")
    else:
        vapi_key = sys.argv[1]
        public_url = sys.argv[2]
        assistant_id = provision_assistant(vapi_key, public_url)
        if assistant_id:
            import_twilio_number(vapi_key, assistant_id)
