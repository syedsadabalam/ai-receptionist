import pytest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone
from app.database import models

def test_vapi_webhook_unhandled_message(client, db_session):
    """Test that non-tool-calls are gracefully ignored."""
    org = models.Organization(name="Test Org", vapi_assistant_id="ast_123")
    db_session.add(org)
    db_session.commit()

    payload = {
        "message": {
            "type": "transcript",
            "role": "user",
            "transcript": "Hello",
            "call": {
                "assistantId": "ast_123"
            }
        }
    }
    response = client.post("/api/v1/voice/vapi/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_vapi_webhook_tool_call_check_availability(client, db_session):
    # Setup organization and provider
    org = models.Organization(name="Test Org", vapi_assistant_id="ast_123")
    db_session.add(org)
    db_session.flush()
    
    provider = models.Provider(organization_id=org.id, name="Test Provider")
    service = models.Service(organization_id=org.id, name="Test Service", duration_minutes=30)
    db_session.add_all([provider, service])
    db_session.commit()

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    payload = {
        "message": {
            "type": "tool-calls",
            "call": {
                "assistantId": "ast_123"
            },
            "toolCalls": [
                {
                    "id": "call_123",
                    "function": {
                        "name": "check_availability",
                        "arguments": {
                            "provider_id": provider.id,
                            "service_id": service.id,
                            "start_time": start_time.isoformat()
                        }
                    }
                }
            ]
        }
    }
    
    response = client.post("/api/v1/voice/vapi/webhook", json=payload)
        
    assert response.status_code == 200
    data = response.json()
    assert "results" in data, f"No results in: {data}"
    assert data["results"][0]["toolCallId"] == "call_123"
    assert "result" in data["results"][0], f"Expected result but got: {data['results'][0]}"
    assert "available" in data["results"][0]["result"]

def test_cross_tenant_check_availability_protection(client, db_session):
    """Verify that looking up provider/service of another tenant fails."""
    # Org A (calling tenant)
    org_a = models.Organization(name="Org A", vapi_assistant_id="ast_a")
    # Org B (foreign tenant)
    org_b = models.Organization(name="Org B", vapi_assistant_id="ast_b")
    db_session.add_all([org_a, org_b])
    db_session.flush()

    provider_b = models.Provider(organization_id=org_b.id, name="Provider B")
    service_b = models.Service(organization_id=org_b.id, name="Service B", duration_minutes=30)
    db_session.add_all([provider_b, service_b])
    db_session.commit()

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    
    # Org A assistant tries to query Org B's provider/service details
    payload = {
        "message": {
            "type": "tool-calls",
            "call": {
                "assistantId": "ast_a"
            },
            "toolCalls": [
                {
                    "id": "call_cross",
                    "function": {
                        "name": "check_availability",
                        "arguments": {
                            "provider_id": provider_b.id,
                            "service_id": service_b.id,
                            "start_time": start_time.isoformat()
                        }
                    }
                }
            ]
        }
    }

    response = client.post("/api/v1/voice/vapi/webhook", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "error" in data["results"][0]
    assert "not found" in data["results"][0]["error"].lower()

def test_cross_tenant_cancel_protection(client, db_session):
    """Verify that rescheduling or canceling another tenant's appointment fails."""
    org_a = models.Organization(name="Org A", vapi_assistant_id="ast_a")
    org_b = models.Organization(name="Org B", vapi_assistant_id="ast_b")
    db_session.add_all([org_a, org_b])
    db_session.flush()

    provider_b = models.Provider(organization_id=org_b.id, name="Provider B")
    service_b = models.Service(organization_id=org_b.id, name="Service B", duration_minutes=30)
    customer_b = models.Customer(organization_id=org_b.id, name="Customer B", phone="+19998887777")
    db_session.add_all([provider_b, service_b, customer_b])
    db_session.flush()

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    appt_b = models.Appointment(
        organization_id=org_b.id,
        provider_id=provider_b.id,
        customer_id=customer_b.id,
        service_id=service_b.id,
        start_time=tomorrow,
        end_time=tomorrow + timedelta(minutes=30),
        status=models.AppointmentStatus.SCHEDULED
    )
    db_session.add(appt_b)
    db_session.commit()

    # Org A tries to cancel Org B's appointment
    payload = {
        "message": {
            "type": "tool-calls",
            "call": {
                "assistantId": "ast_a"
            },
            "toolCalls": [
                {
                    "id": "cancel_cross",
                    "function": {
                        "name": "cancel_appointment",
                        "arguments": {
                            "appointment_id": appt_b.id
                        }
                    }
                }
            ]
        }
    }

    response = client.post("/api/v1/voice/vapi/webhook", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "error" in data["results"][0]
    assert "not found" in data["results"][0]["error"].lower()

    # Confirm appointment is still active (not cancelled)
    db_session.refresh(appt_b)
    assert appt_b.status == models.AppointmentStatus.SCHEDULED
