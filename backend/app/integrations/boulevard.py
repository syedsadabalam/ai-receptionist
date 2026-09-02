import requests
import logging

logger = logging.getLogger(__name__)

class BoulevardService:
    def __init__(self):
        self.endpoint = "https://api.boulevard.io/graphql"

    def book_appointment(
        self,
        api_key: str,
        business_id: str,
        summary: str,
        description: str,
        start_time: str,
        end_time: str,
        customer_name: str = "",
        customer_phone: str = "",
        customer_email: str = "",
    ) -> dict:
        """
        Creates an appointment in Boulevard via GraphQL.
        customer_name, customer_phone, and customer_email should be the real
        caller details collected by the AI receptionist.
        """
        if not api_key or not business_id:
            logger.error("Boulevard credentials missing.")
            return None

        # Split customer name into first/last for Boulevard's API
        name_parts = customer_name.strip().split(" ", 1)
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = name_parts[1] if len(name_parts) > 1 else "Caller"

        # Sample GraphQL Mutation for Boulevard Appointment Booking
        query = """
        mutation CreateAppointment($input: CreateAppointmentInput!) {
            createAppointment(input: $input) {
                appointment {
                    id
                    startAt
                    state
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            "input": {
                "businessId": business_id,
                "startAt": start_time,
                "notes": f"{summary}\n{description}",
                "client": {
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": customer_email or f"{customer_phone.replace('+', '')}@noemail.local",
                    "mobilePhone": customer_phone,
                }
            }
        }

        headers = {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                self.endpoint,
                json={"query": query, "variables": variables},
                headers=headers
            )
            if response.status_code == 200:
                res_data = response.json()
                errors = res_data.get("data", {}).get("createAppointment", {}).get("userErrors", [])
                if errors:
                    logger.error(f"Boulevard mutation error: {errors}")
                    raise ValueError(errors[0].get("message"))
                logger.info("Successfully booked appointment in Boulevard.")
                return res_data
            else:
                logger.error(f"Failed to book in Boulevard. Status: {response.status_code}, Body: {response.text}")
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Error calling Boulevard API: {e}")
            raise e

boulevard_service = BoulevardService()

