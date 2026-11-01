import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

@router.get("/{patient_id}", response_model=List[schemas.PrescriptionResponse])
def get_patient_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    """Retrieve all digital prescriptions for a patient."""
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_id == patient_id
    ).order_by(models.Prescription.prescription_date.desc(), models.Prescription.prescription_id.desc()).all()

    results = []
    for pr in prescriptions:
        results.append(schemas.PrescriptionResponse(
            prescription_id=pr.prescription_id,
            patient_id=pr.patient_id,
            doctor_id=pr.doctor_id,
            appointment_id=pr.appointment_id,
            medicines=pr.medicines,
            dosage=pr.dosage,
            instructions=pr.instructions,
            prescription_date=pr.prescription_date,
            doctor_name=pr.doctor.name if pr.doctor else None,
            doctor_specialization=pr.doctor.specialization if pr.doctor else None
        ))
    return results

@router.post("", response_model=schemas.PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_prescription(req: schemas.PrescriptionCreateRequest, db: Session = Depends(get_db)):
    """Doctor creates a prescription for an appointment and patient."""
    date = req.prescription_date or datetime.date.today().isoformat()

    pr = models.Prescription(
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        appointment_id=req.appointment_id,
        medicines=req.medicines,
        dosage=req.dosage,
        instructions=req.instructions,
        prescription_date=date
    )
    db.add(pr)

    # If linked to appointment, mark it as Completed
    if req.appointment_id:
        appt = db.query(models.Appointment).filter(models.Appointment.appointment_id == req.appointment_id).first()
        if appt:
            appt.status = "Completed"

    db.commit()
    db.refresh(pr)

    return schemas.PrescriptionResponse(
        prescription_id=pr.prescription_id,
        patient_id=pr.patient_id,
        doctor_id=pr.doctor_id,
        appointment_id=pr.appointment_id,
        medicines=pr.medicines,
        dosage=pr.dosage,
        instructions=pr.instructions,
        prescription_date=pr.prescription_date,
        doctor_name=pr.doctor.name if pr.doctor else None,
        doctor_specialization=pr.doctor.specialization if pr.doctor else None
    )
