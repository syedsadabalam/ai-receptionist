import requests
from app.core.config import settings
from app.ai.prompts import get_receptionist_prompt

VAPI_BASE_URL = "https://api.vapi.ai"

class VapiService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.VAPI_API_KEY}",
            "Content-Type": "application/json"
        }

    def create_assistant(self, org_data):
        """
        Creates a Vapi assistant for a specific organization.
        """
        prompt = get_receptionist_prompt(
            organization_name=org_data["name"],
            organization_industry=org_data.get("industry", "clinic"),
            organization_hours=org_data.get("hours", "9 AM - 5 PM"),
            services_text=org_data.get("services_text", "- Cleaning\n- Checkup"),
            providers_text=org_data.get("providers_text", "- Any Provider"),
            address=org_data.get("address", "Unknown")
        )

        payload = {
            "name": f"{org_data['name']} Receptionist",
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": prompt}],
                "tools": [
                    {
                        "type": "function",
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
                    }
                ]
            },
            "voice": {
                "provider": "11labs",
                "voiceId": "b5RPB35vTODb3BEmR3Fc", # Jennifer
                "model": "eleven_multilingual_v2"
            },
            "firstMessage": f"Thank you for calling {org_data['name']}. How can I help you today?",
            "serverUrl": f"{settings.PUBLIC_URL}{settings.API_V1_STR}/voice/vapi/webhook"
        }

        response = requests.post(f"{VAPI_BASE_URL}/assistant", json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()

vapi_service = VapiService()
