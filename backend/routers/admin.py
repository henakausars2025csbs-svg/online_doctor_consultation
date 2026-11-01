from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard(db: Session = Depends(get_db)):
    """Retrieve real-time live statistical counters for the admin dashboard."""
    patient_count = db.query(models.Patient).filter(models.Patient.is_active == True).count()
    doctor_count = db.query(models.Doctor).filter(models.Doctor.is_active == True).count()
    total_appts = db.query(models.Appointment).count()
    pending_appts = db.query(models.Appointment).filter(models.Appointment.status == "Scheduled").count()
    completed_appts = db.query(models.Appointment).filter(models.Appointment.status == "Completed").count()
    cancelled_appts = db.query(models.Appointment).filter(models.Appointment.status == "Cancelled").count()

    # Revenue calculation: consultation fees for completed appointments
    completed = db.query(models.Appointment).filter(models.Appointment.status == "Completed").all()
    total_rev = sum(a.doctor.consultation_fee for a in completed if a.doctor)

    return schemas.AdminDashboardStats(
        total_patients=patient_count,
        total_doctors=doctor_count,
        total_appointments=total_appts,
        pending_appointments=pending_appts,
        completed_appointments=completed_appts,
        cancelled_appointments=cancelled_appts,
        total_revenue=float(total_rev)
    )

@router.get("/reports")
def get_admin_reports(db: Session = Depends(get_db)):
    """Generate comprehensive analytics and breakdowns for the platform."""
    # Specialization breakdown
    spec_query = db.query(
        models.Doctor.specialization,
        func.count(models.Doctor.doctor_id).label("doctor_count")
    ).group_by(models.Doctor.specialization).all()

    specializations = [{"specialization": s[0], "doctor_count": s[1]} for s in spec_query]

    # Status summary
    status_query = db.query(
        models.Appointment.status,
        func.count(models.Appointment.appointment_id).label("count")
    ).group_by(models.Appointment.status).all()

    status_summary = [{"status": st[0], "count": st[1]} for st in status_query]

    # Doctor performance breakdown
    doctors = db.query(models.Doctor).all()
    doctor_stats = []
    for d in doctors:
        appts = db.query(models.Appointment).filter(models.Appointment.doctor_id == d.doctor_id).all()
        total_c = len(appts)
        completed_c = sum(1 for a in appts if a.status == "Completed")
        cancelled_c = sum(1 for a in appts if a.status == "Cancelled")
        doctor_stats.append({
            "doctor_id": d.doctor_id,
            "name": d.name,
            "specialization": d.specialization,
            "total_consultations": total_c,
            "completed_consultations": completed_c,
            "cancelled_consultations": cancelled_c
        })

    return {
        "specializations": specializations,
        "status_summary": status_summary,
        "doctor_stats": doctor_stats
    }

@router.put("/users/{role}/{id}/status")
def toggle_user_status(role: str, id: int, status_body: Dict[str, Any], db: Session = Depends(get_db)):
    """Activate or deactivate patient or doctor accounts."""
    is_active = status_body.get("is_active", True)
    if role == "patient":
        p = db.query(models.Patient).filter(models.Patient.patient_id == id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found.")
        p.is_active = is_active
        db.commit()
        return {"message": f"Patient account {'activated' if is_active else 'deactivated'} successfully."}
    elif role == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.doctor_id == id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Doctor not found.")
        d.is_active = is_active
        d.availability_status = "Available" if is_active else "Unavailable"
        db.commit()
        return {"message": f"Doctor account {'activated' if is_active else 'deactivated'} successfully."}

    raise HTTPException(status_code=400, detail="Invalid user role specified.")
