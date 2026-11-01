from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[schemas.PatientResponse])
def get_all_patients(db: Session = Depends(get_db)):
    """Retrieve all patients with appointment counts."""
    patients = db.query(models.Patient).order_by(models.Patient.patient_id.desc()).all()
    result = []
    for p in patients:
        count = db.query(models.Appointment).filter(models.Appointment.patient_id == p.patient_id).count()
        result.append(schemas.PatientResponse(
            patient_id=p.patient_id,
            name=p.name,
            phone_number=p.phone_number,
            email=p.email,
            gender=p.gender,
            date_of_birth=p.date_of_birth,
            is_active=p.is_active,
            appointment_count=count
        ))
    return result

@router.get("/{id}", response_model=schemas.PatientResponse)
def get_patient_by_id(id: int, db: Session = Depends(get_db)):
    """Get single patient details."""
    patient = db.query(models.Patient).filter(models.Patient.patient_id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    count = db.query(models.Appointment).filter(models.Appointment.patient_id == patient.patient_id).count()
    return schemas.PatientResponse(
        patient_id=patient.patient_id,
        name=patient.name,
        phone_number=patient.phone_number,
        email=patient.email,
        gender=patient.gender,
        date_of_birth=patient.date_of_birth,
        is_active=patient.is_active,
        appointment_count=count
    )

@router.put("/{id}", response_model=schemas.PatientResponse)
def update_patient(id: int, req: schemas.PatientUpdateRequest, db: Session = Depends(get_db)):
    """Update patient information or account active state."""
    patient = db.query(models.Patient).filter(models.Patient.patient_id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    if req.name is not None:
        patient.name = req.name
    if req.phone_number is not None:
        patient.phone_number = req.phone_number
    if req.gender is not None:
        patient.gender = req.gender
    if req.date_of_birth is not None:
        patient.date_of_birth = req.date_of_birth
    if req.is_active is not None:
        patient.is_active = req.is_active

    db.commit()
    db.refresh(patient)
    count = db.query(models.Appointment).filter(models.Appointment.patient_id == patient.patient_id).count()
    return schemas.PatientResponse(
        patient_id=patient.patient_id,
        name=patient.name,
        phone_number=patient.phone_number,
        email=patient.email,
        gender=patient.gender,
        date_of_birth=patient.date_of_birth,
        is_active=patient.is_active,
        appointment_count=count
    )
