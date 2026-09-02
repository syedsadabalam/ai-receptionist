import requests
import json
import uuid
from datetime import datetime, timedelta

def simulate_vapi_tool_call():
    url = "http://localhost:8000/api/v1/voice/vapi/webhook"
    
    # Mock Vapi payload for create_appointment
    # Using the IDs from our seed data (Clinic 1, Provider 1, Service 1)
    start_time = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    tool_call_id = f"call_{uuid.uuid4().hex[:8]}"
    
    payload = {
        "message": {
            "type": "tool-calls",
            "call": {
                "assistantId": "a8afe37d-2cef-4711-8cc4-3112445c1f20"
            },
            "toolCalls": [
                {
                    "id": tool_call_id,
                    "type": "function",
                    "function": {
                        "name": "create_appointment",
                        "arguments": {
                            "organization_id": 1,
                            "provider_id": 1,
                            "service_id": 1,
                            "patient_name": "Test Google Sync",
                            "patient_phone": "+14165550199",
                            "start_time": start_time.isoformat(),
                            "notes": "Testing Google Calendar Sync"
                        }
                    }
                }
            ]
        }
    }
    
    print(f"Sending mock tool call to {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\nSuccess! The backend processed the Vapi tool call correctly.")
        else:
            print("\nFailed. Check the backend logs for details.")
            
    except Exception as e:
        print(f"\nConnection error: {e}")
        print("Is the FastAPI server running on port 8000?")

if __name__ == "__main__":
    simulate_vapi_tool_call()
