from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.get("", response_model=List[schemas.AppointmentResponse])
def get_appointments(
    patient_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve appointments filtered by patient, doctor, status or date."""
    query = db.query(models.Appointment)

    if patient_id:
        query = query.filter(models.Appointment.patient_id == patient_id)
    if doctor_id:
        query = query.filter(models.Appointment.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(models.Appointment.status == status_filter)
    if date:
        query = query.filter(models.Appointment.appointment_date == date)

    appointments = query.order_by(models.Appointment.appointment_date.desc(), models.Appointment.appointment_time.desc()).all()
    results = []
    for a in appointments:
        results.append(schemas.AppointmentResponse(
            appointment_id=a.appointment_id,
            patient_id=a.patient_id,
            doctor_id=a.doctor_id,
            appointment_date=a.appointment_date,
            appointment_time=a.appointment_time,
            status=a.status,
            reason=a.reason,
            notes=a.notes,
            patient_name=a.patient.name if a.patient else None,
            doctor_name=a.doctor.name if a.doctor else None,
            doctor_specialization=a.doctor.specialization if a.doctor else None,
            doctor_fee=a.doctor.consultation_fee if a.doctor else None,
            doctor_avatar=a.doctor.avatar_url if a.doctor else None
        ))
    return results

@router.post("", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(req: schemas.AppointmentCreateRequest, db: Session = Depends(get_db)):
    """Book an appointment with double-booking prevention."""
    # 1. Double booking check for doctor
    existing_doc_booking = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == req.doctor_id,
        models.Appointment.appointment_date == req.appointment_date,
        models.Appointment.appointment_time == req.appointment_time,
        models.Appointment.status != "Cancelled"
    ).first()

    if existing_doc_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This doctor already has a booked appointment at this date and time slot."
        )

    # 2. Overlap check for patient
    existing_patient_booking = db.query(models.Appointment).filter(
        models.Appointment.patient_id == req.patient_id,
        models.Appointment.appointment_date == req.appointment_date,
        models.Appointment.appointment_time == req.appointment_time,
        models.Appointment.status != "Cancelled"
    ).first()

    if existing_patient_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have another active appointment at this date and time slot."
        )

    appt = models.Appointment(
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        appointment_date=req.appointment_date,
        appointment_time=req.appointment_time,
        status="Scheduled",
        reason=req.reason,
        notes=req.notes or ""
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    return schemas.AppointmentResponse(
        appointment_id=appt.appointment_id,
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        appointment_date=appt.appointment_date,
        appointment_time=appt.appointment_time,
        status=appt.status,
        reason=appt.reason,
        notes=appt.notes,
        patient_name=appt.patient.name if appt.patient else None,
        doctor_name=appt.doctor.name if appt.doctor else None,
        doctor_specialization=appt.doctor.specialization if appt.doctor else None,
        doctor_fee=appt.doctor.consultation_fee if appt.doctor else None,
        doctor_avatar=appt.doctor.avatar_url if appt.doctor else None
    )

@router.get("/{id}", response_model=schemas.AppointmentResponse)
def get_appointment_by_id(id: int, db: Session = Depends(get_db)):
    """Get single appointment details."""
    a = db.query(models.Appointment).filter(models.Appointment.appointment_id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    return schemas.AppointmentResponse(
        appointment_id=a.appointment_id,
        patient_id=a.patient_id,
        doctor_id=a.doctor_id,
        appointment_date=a.appointment_date,
        appointment_time=a.appointment_time,
        status=a.status,
        reason=a.reason,
        notes=a.notes,
        patient_name=a.patient.name if a.patient else None,
        doctor_name=a.doctor.name if a.doctor else None,
        doctor_specialization=a.doctor.specialization if a.doctor else None,
        doctor_fee=a.doctor.consultation_fee if a.doctor else None,
        doctor_avatar=a.doctor.avatar_url if a.doctor else None
    )

@router.put("/{id}", response_model=schemas.AppointmentResponse)
def update_appointment(id: int, req: schemas.AppointmentUpdateRequest, db: Session = Depends(get_db)):
    """Update appointment status or clinical notes."""
    a = db.query(models.Appointment).filter(models.Appointment.appointment_id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if req.status is not None:
        a.status = req.status
    if req.notes is not None:
        a.notes = req.notes
    if req.reason is not None:
        a.reason = req.reason

    db.commit()
    db.refresh(a)

    return schemas.AppointmentResponse(
        appointment_id=a.appointment_id,
        patient_id=a.patient_id,
        doctor_id=a.doctor_id,
        appointment_date=a.appointment_date,
        appointment_time=a.appointment_time,
        status=a.status,
        reason=a.reason,
        notes=a.notes,
        patient_name=a.patient.name if a.patient else None,
        doctor_name=a.doctor.name if a.doctor else None,
        doctor_specialization=a.doctor.specialization if a.doctor else None,
        doctor_fee=a.doctor.consultation_fee if a.doctor else None,
        doctor_avatar=a.doctor.avatar_url if a.doctor else None
    )

@router.delete("/{id}")
def cancel_appointment(id: int, db: Session = Depends(get_db)):
    """Cancel an appointment."""
    a = db.query(models.Appointment).filter(models.Appointment.appointment_id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    a.status = "Cancelled"
    db.commit()
    return {"message": "Appointment cancelled successfully."}
