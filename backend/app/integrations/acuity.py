import requests
import logging

logger = logging.getLogger(__name__)

class AcuityService:
    def __init__(self):
        self.base_url = "https://acuityscheduling.com/api/v1"

    def book_appointment(
        self,
        user_id: str,
        api_key: str,
        summary: str,
        description: str,
        start_time: str,
        end_time: str,
        customer_name: str = "",
        customer_phone: str = "",
        customer_email: str = "",
    ) -> dict:
        """
        Creates an appointment in Acuity Scheduling.
        customer_name, customer_phone, and customer_email should be the real
        caller details collected by the AI receptionist.
        """
        if not user_id or not api_key:
            logger.error("Acuity credentials missing.")
            return None

        # Split customer name into first/last for Acuity's API
        name_parts = customer_name.strip().split(" ", 1)
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = name_parts[1] if len(name_parts) > 1 else "Caller"

        payload = {
            "datetime": start_time,
            "firstName": first_name,
            "lastName": last_name,
            "email": customer_email or f"{customer_phone.replace('+', '')}@noemail.local",
            "phone": customer_phone,
            "notes": f"{summary}\n{description}"
        }

        try:
            response = requests.post(
                f"{self.base_url}/appointments",
                json=payload,
                auth=(user_id, api_key),
                headers={"Content-Type": "application/json"}
            )
            if response.status_code in [200, 201]:
                logger.info("Successfully booked appointment in Acuity.")
                return response.json()
            else:
                logger.error(f"Failed to book in Acuity. Status: {response.status_code}, Body: {response.text}")
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Error calling Acuity API: {e}")
            raise e

acuity_service = AcuityService()

