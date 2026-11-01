from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/availability", tags=["Availability"])

@router.get("/{doctor_id}", response_model=List[schemas.AvailabilityResponse])
def get_doctor_availability(
    doctor_id: int,
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get active availability slots for a doctor with booking conflict flags."""
    query = db.query(models.DoctorAvailability).filter(
        models.DoctorAvailability.doctor_id == doctor_id,
        models.DoctorAvailability.is_available == True
    )

    if date:
        query = query.filter(models.DoctorAvailability.available_date == date)

    slots = query.order_by(
        models.DoctorAvailability.available_date.asc(),
        models.DoctorAvailability.start_time.asc()
    ).all()

    # Get booked slots for this doctor
    booked_appts = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor_id,
        models.Appointment.status != "Cancelled"
    ).all()

    booked_set = set(f"{b.appointment_date}_{b.appointment_time}" for b in booked_appts)

    results = []
    for s in slots:
        is_booked = f"{s.available_date}_{s.start_time}" in booked_set
        results.append(schemas.AvailabilityResponse(
            availability_id=s.availability_id,
            doctor_id=s.doctor_id,
            available_date=s.available_date,
            start_time=s.start_time,
            end_time=s.end_time,
            is_available=s.is_available,
            is_booked=is_booked
        ))
    return results

@router.post("", status_code=status.HTTP_201_CREATED)
def set_doctor_availability(req: schemas.AvailabilityCreateRequest, db: Session = Depends(get_db)):
    """Add or update an available slot for a doctor."""
    existing = db.query(models.DoctorAvailability).filter(
        models.DoctorAvailability.doctor_id == req.doctor_id,
        models.DoctorAvailability.available_date == req.available_date,
        models.DoctorAvailability.start_time == req.start_time,
        models.DoctorAvailability.end_time == req.end_time
    ).first()

    if existing:
        existing.is_available = req.is_available
        db.commit()
        return {"message": "Slot updated successfully."}

    slot = models.DoctorAvailability(
        doctor_id=req.doctor_id,
        available_date=req.available_date,
        start_time=req.start_time,
        end_time=req.end_time,
        is_available=req.is_available
    )
    db.add(slot)
    db.commit()
    return {"message": "Availability slot added successfully."}

@router.delete("/{id}")
def remove_availability_slot(id: int, db: Session = Depends(get_db)):
    """Remove an availability slot."""
    slot = db.query(models.DoctorAvailability).filter(models.DoctorAvailability.availability_id == id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    db.delete(slot)
    db.commit()
    return {"message": "Slot removed successfully."}
