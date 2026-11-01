import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/medical-records", tags=["Medical Records"])

@router.get("/{patient_id}", response_model=List[schemas.MedicalRecordResponse])
def get_patient_medical_records(patient_id: int, db: Session = Depends(get_db)):
    """Retrieve all medical records for a specific patient."""
    records = db.query(models.MedicalRecord).filter(
        models.MedicalRecord.patient_id == patient_id
    ).order_by(models.MedicalRecord.record_date.desc(), models.MedicalRecord.record_id.desc()).all()

    results = []
    for r in records:
        results.append(schemas.MedicalRecordResponse(
            record_id=r.record_id,
            patient_id=r.patient_id,
            doctor_id=r.doctor_id,
            diagnosis=r.diagnosis,
            symptoms=r.symptoms,
            treatment=r.treatment,
            record_date=r.record_date,
            doctor_name=r.doctor.name if r.doctor else "Self Reported",
            doctor_specialization=r.doctor.specialization if r.doctor else None
        ))
    return results

@router.post("", response_model=schemas.MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_medical_record(req: schemas.MedicalRecordCreateRequest, db: Session = Depends(get_db)):
    """Add a new medical record (by doctor or patient)."""
    date = req.record_date or datetime.date.today().isoformat()
    record = models.MedicalRecord(
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        diagnosis=req.diagnosis,
        symptoms=req.symptoms,
        treatment=req.treatment or "",
        record_date=date
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return schemas.MedicalRecordResponse(
        record_id=record.record_id,
        patient_id=record.patient_id,
        doctor_id=record.doctor_id,
        diagnosis=record.diagnosis,
        symptoms=record.symptoms,
        treatment=record.treatment,
        record_date=record.record_date,
        doctor_name=record.doctor.name if record.doctor else "Self Reported",
        doctor_specialization=record.doctor.specialization if record.doctor else None
    )
