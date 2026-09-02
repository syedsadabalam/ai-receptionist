import requests
import time
from provision_vapi_assistant import provision_assistant
from app.core.config import settings

def get_public_url():
    url = settings.PUBLIC_URL
    if not url:
        print("Error: PUBLIC_URL not set in environment.")
        return None
    return url

def sync():
    vapi_key = settings.VAPI_API_KEY or "21f87301-15b3-48d7-90a2-f6757af366fd"
    
    print("--- Vapi Auto-Sync Starting ---")
    
    url = get_public_url()
    if not url:
        return
    
    if url:
        print(f"Found Public URL: {url}")
        print("Provisioning Vapi Assistant...")
        assistant_id = provision_assistant(vapi_key, url)
        if assistant_id:
            print(f"SUCCESS! AI is now connected to {url}")
        else:
            print("Failed to update Vapi.")
    else:
        print("\n❌ STILL CANNOT FIND NGROK.")
        print("1. Go to your other terminal.")
        print("2. Type: ngrok http 8000")
        print("3. Make sure it shows the 'Session Status: online' screen.")
        print("4. Come back here and run sync_vapi.py again.")

if __name__ == "__main__":
    sync()
