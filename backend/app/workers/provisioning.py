import logging
from app.database.session import SessionLocal
from app.database import models
from app.core.config import settings
import requests
from twilio.rest import Client
from app.ai.prompts import get_receptionist_prompt

logger = logging.getLogger(__name__)

VAPI_BASE_URL = "https://api.vapi.ai"

def provision_ai_assistant(organization_id: int):
    logger.info(f"Starting provisioning for organization ID: {organization_id}")
    db = SessionLocal()
    try:
        organization = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
        if not organization:
            logger.error("Organization not found")
            return
            
        # 1. Twilio Sub-Account & Number Purchase
        logger.info("Setting up Twilio sub-account and purchasing number...")
        twilio_number = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                master_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                
                # Check or Create Sub-Account
                if not organization.twilio_subaccount_sid:
                    logger.info(f"Creating Twilio sub-account for: {organization.name}")
                    sub_account = master_client.api.accounts.create(friendly_name=f"{organization.name} - AI Receptionist")
                    organization.twilio_subaccount_sid = sub_account.sid
                    organization.twilio_subaccount_auth_token = sub_account.auth_token
                    db.commit()
                    logger.info(f"Created Twilio sub-account: {sub_account.sid}")
                
                # Initialize client for Sub-Account
                sub_client = Client(organization.twilio_subaccount_sid, organization.twilio_subaccount_auth_token)
                
                # Search for available numbers
                available_numbers = sub_client.available_phone_numbers('US').local.list(limit=1)
                if available_numbers:
                    number_to_buy = available_numbers[0].phone_number
                    purchased_number = sub_client.incoming_phone_numbers.create(
                        phone_number=number_to_buy,
                        voice_url="https://api.vapi.ai/telephony/incoming/twilio" # Point directly to Vapi
                    )
                    twilio_number = purchased_number.phone_number
                    organization.twilio_phone_number_sid = purchased_number.sid
                    organization.phone_number = twilio_number
                    db.commit()
                    logger.info(f"Successfully purchased Twilio number {twilio_number} in sub-account {organization.twilio_subaccount_sid}")
                else:
                    logger.warning("No available numbers found in sub-account.")
            except Exception as e:
                logger.error(f"Failed to set up Twilio sub-account/number: {e}")
        else:
            logger.warning("Twilio credentials not found, skipping sub-account/number purchase.")

        if not twilio_number:
            twilio_number = settings.TWILIO_PHONE_NUMBER
            logger.info(f"Falling back to default Twilio number: {twilio_number}")

        # 2. Provision Vapi Assistant
        services = db.query(models.Service).filter(models.Service.organization_id == organization_id).all()
        providers = db.query(models.Provider).filter(models.Provider.organization_id == organization_id).all()
        # 2. Build AI Prompt and Payload
        services_text = "\n".join([f"- {s.name} ({s.duration_minutes} min) - ${s.price:.2f}" for s in organization.services])
        providers_text = "\n".join([f"- {p.name} ({p.specialty})" for p in organization.providers])
        
        headers = {
            "Authorization": f"Bearer {settings.VAPI_API_KEY}",
            "Content-Type": "application/json"
        }

        # Build prompt
        prompt = get_receptionist_prompt(
            organization_name=organization.name,
            organization_industry=organization.industry or "clinic",
            organization_hours=f"{organization.open_time} - {organization.close_time}",
            services_text=services_text,
            providers_text=providers_text,
            address=organization.address or "Address not provided",
            emergency_phone=organization.emergency_phone,
            website=organization.website_url,
            timezone=organization.timezone or "UTC",
            custom_prompt=organization.custom_prompt
        )

        public_url = settings.PUBLIC_URL
        if not public_url:
            logger.error("PUBLIC_URL is not set in .env. Cannot configure Vapi webhook URL.")
            return
        
        payload = {
            "name": f"{organization.name} AI Receptionist",
            "firstMessage": f"Thank you for calling {organization.name}. How can I help you today?",
            "silenceTimeoutSeconds": 0.6,
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
                            "description": "Create a new appointment for a customer.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "provider_id": {"type": "integer"},
                                    "service_id": {"type": "integer"},
                                    "customer_name": {"type": "string"},
                                    "customer_phone": {"type": "string"},
                                    "start_time": {"type": "string", "format": "date-time"},
                                    "notes": {"type": "string"}
                                },
                                "required": ["provider_id", "service_id", "customer_name", "customer_phone", "start_time"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "messages": [
                            {
                                "type": "request-start",
                                "content": "Let me pull up your appointments."
                            }
                        ],
                        "function": {
                            "name": "get_customer_appointments",
                            "description": "Get a list of upcoming appointments for a customer using their phone number.",
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
                        "messages": [
                            {
                                "type": "request-start",
                                "content": "Let me move that appointment for you."
                            }
                        ],
                        "function": {
                            "name": "reschedule_appointment",
                            "description": "Reschedule an existing appointment to a new time.",
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
                        "messages": [
                            {
                                "type": "request-start",
                                "content": "I am canceling that now."
                            }
                        ],
                        "function": {
                            "name": "cancel_appointment",
                            "description": "Cancel an existing appointment.",
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
                        "function": {
                            "name": "transfer_call",
                            "description": "Transfer the caller to a human representative.",
                            "parameters": {
                                "type": "object",
                                "properties": {}
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
                            "description": "Get FAQs or rules about the organization (e.g. parking, insurance).",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {"type": "string"}
                                },
                                "required": ["query"]
                            }
                        }
                    }
                ]
            },
            "voice": {
                "provider": "deepgram",
                "voiceId": organization.vapi_voice_id if organization.vapi_voice_id else "asteria"
            },
            "serverUrl": f"{public_url}/api/v1/voice/vapi/webhook"
        }

        logger.info("Creating Vapi Assistant...")
        response = requests.post(f"{VAPI_BASE_URL}/assistant", json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            data = response.json()
            assistant_id = data.get('id')
            logger.info(f"Success! Assistant Created. ID: {assistant_id}")

            # Store assistant_id on the organization for multi-tenant webhook routing
            organization.vapi_assistant_id = assistant_id
            db.commit()
            
            # 3. Link Twilio Number
            if twilio_number and assistant_id:
                # Use sub-account credentials if available, otherwise master settings
                acc_sid = organization.twilio_subaccount_sid or settings.TWILIO_ACCOUNT_SID
                acc_token = organization.twilio_subaccount_auth_token or settings.TWILIO_AUTH_TOKEN
                
                link_payload = {
                    "provider": "twilio",
                    "number": twilio_number,
                    "twilioAccountSid": acc_sid,
                    "twilioAuthToken": acc_token,
                    "assistantId": assistant_id,
                    "name": f"{organization.name} Main Line"
                }
                logger.info(f"Importing Twilio number {twilio_number} to Vapi...")
                link_res = requests.post(f"{VAPI_BASE_URL}/phone-number", json=link_payload, headers=headers)
                
                if link_res.status_code in [200, 201]:
                    logger.info("Successfully linked Twilio number to Vapi assistant.")
                else:
                    logger.error(f"Failed to link Twilio number: {link_res.text}")

        else:
            logger.error(f"Failed to create Vapi Assistant: {response.text}")

    except Exception as e:
        logger.error(f"Exception during provisioning: {e}")
    finally:
        db.close()
