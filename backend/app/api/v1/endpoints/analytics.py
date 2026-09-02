from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.database import models
from app.core.auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    High-level metrics for the dashboard cards.
    """
    # Customer scope: Join with Appointment to only count customers who have visited this org, and not deleted
    total_customers = db.query(models.Customer).join(models.Appointment).filter(
        models.Appointment.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False
    ).distinct().count()

    total_appointments = db.query(models.Appointment).filter(
        models.Appointment.organization_id == current_user.organization_id
    ).count()

    completed_appointments = db.query(models.Appointment).filter(
        models.Appointment.organization_id == current_user.organization_id,
        models.Appointment.status == models.AppointmentStatus.COMPLETED
    ).count()

    # AI Efficiency: Calls that didn't need human transfer
    total_calls = db.query(models.CallLog).filter(
        models.CallLog.organization_id == current_user.organization_id
    ).count()

    successful_calls = db.query(models.CallLog).filter(
        models.CallLog.organization_id == current_user.organization_id,
        models.CallLog.status != "transferred"
    ).count()

    ai_efficiency = (successful_calls / total_calls * 100) if total_calls > 0 else 0

    # New customers created in the last 30 days within this organization
    last_30_days = datetime.now(timezone.utc) - timedelta(days=30)
    new_customers_30d = db.query(models.Customer).join(models.Appointment).filter(
        models.Appointment.organization_id == current_user.organization_id,
        models.Customer.is_deleted == False,
        models.Customer.created_at >= last_30_days
    ).distinct().count()

    return {
        "total_customers": total_customers,
        "total_appointments": total_appointments,
        "ai_efficiency": round(ai_efficiency, 1),
        "total_calls": total_calls,
        "new_customers_30d": new_customers_30d
    }

@router.get("/trends")
def get_trends(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Returns appointment volume over the last 7 days.
    """
    start_date = (datetime.now(timezone.utc) - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

    results = db.query(
        func.date(models.Appointment.start_time).label('day'),
        func.count(models.Appointment.id).label('count')
    ).filter(
        models.Appointment.organization_id == current_user.organization_id,
        models.Appointment.start_time >= start_date
    ).group_by(
        func.date(models.Appointment.start_time)
    ).all()

    counts_by_date = {row.day: row.count for row in results}

    trends = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        trends.append({
            "day": day.strftime("%a"),
            "count": counts_by_date.get(day, 0)
        })
    return trends

@router.get("/call-stats")
def get_call_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Metrics for AI performance.
    """
    total_duration = db.query(func.sum(models.CallLog.duration_seconds)).filter(
        models.CallLog.organization_id == current_user.organization_id
    ).scalar() or 0

    avg_duration = db.query(func.avg(models.CallLog.duration_seconds)).filter(
        models.CallLog.organization_id == current_user.organization_id
    ).scalar() or 0

    # Compute peak hour from real call log timestamps
    peak_hour_row = db.query(
        func.extract('hour', models.CallLog.created_at).label('hour'),
        func.count(models.CallLog.id).label('count')
    ).filter(
        models.CallLog.organization_id == current_user.organization_id
    ).group_by(
        func.extract('hour', models.CallLog.created_at)
    ).order_by(
        func.count(models.CallLog.id).desc()
    ).first()

    if peak_hour_row:
        hour = int(peak_hour_row.hour)
        suffix = "AM" if hour < 12 else "PM"
        display_hour = hour if hour <= 12 else hour - 12
        display_hour = 12 if display_hour == 0 else display_hour
        peak_hour = f"{display_hour}:00 {suffix}"
    else:
        peak_hour = None

    return {
        "total_voice_minutes": round(total_duration / 60, 1),
        "avg_call_duration": round(avg_duration, 1),
        "peak_hour": peak_hour
    }

