# AI Dental Receptionist Backend

## Setup

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Update the `.env` file with your credentials:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `VAPI_API_KEY`: From Vapi dashboard.
   - `TWILIO_ACCOUNT_SID`: From Twilio dashboard.
   - `TWILIO_AUTH_TOKEN`: From Twilio dashboard.

3. **Database Migrations:**
   Once you have PostgreSQL running, run:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

4. **Seed Initial Data:**
   To test the system, seed some sample data:
   ```bash
   python seed.py
   ```

5. **Run the Server:**
   ```bash
   python run.py
   ```

## API Endpoints

- `GET /`: Welcome message.
- `POST /api/v1/appointments/create`: Manually create an appointment.
- `POST /api/v1/voice/vapi/webhook`: Vapi webhook for tool calling.

## Architecture Highlights

- **Modular Monolith:** Designed for fast iteration and low complexity.
- **Transactional Scheduling:** Ensures no double bookings.
- **AI Tool Calling:** AI interacts with the database only through validated tools.
