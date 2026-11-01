from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("", response_model=List[schemas.DoctorResponse])
def get_all_doctors(
    search: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve doctors with search and specialization filter."""
    query = db.query(models.Doctor)

    if search:
        query = query.filter(
            or_(
                models.Doctor.name.ilike(f"%{search}%"),
                models.Doctor.specialization.ilike(f"%{search}%")
            )
        )

    if specialization and specialization != "All":
        query = query.filter(models.Doctor.specialization == specialization)

    doctors = query.order_by(models.Doctor.name.asc()).all()
    result = []
    for d in doctors:
        count = db.query(models.Appointment).filter(models.Appointment.doctor_id == d.doctor_id).count()
        result.append(schemas.DoctorResponse(
            doctor_id=d.doctor_id,
            name=d.name,
            specialization=d.specialization,
            phone_number=d.phone_number,
            email=d.email,
            availability_status=d.availability_status,
            bio=d.bio,
            consultation_fee=d.consultation_fee,
            experience_years=d.experience_years,
            avatar_url=d.avatar_url,
            is_active=d.is_active,
            total_appointments=count
        ))
    return result

@router.post("", response_model=schemas.DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(req: schemas.DoctorCreateRequest, db: Session = Depends(get_db)):
    """Admin creates a new doctor."""
    existing = db.query(models.Doctor).filter(models.Doctor.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A doctor with this email already exists.")

    hashed_pw = auth.hash_password(req.password)
    doctor = models.Doctor(
        name=req.name,
        specialization=req.specialization,
        phone_number=req.phone_number,
        email=req.email,
        password_hash=hashed_pw,
        bio=req.bio or "Dedicated specialist physician providing quality consultation.",
        consultation_fee=req.consultation_fee or 60.0,
        experience_years=req.experience_years or 5,
        avatar_url=req.avatar_url or "/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg",
        is_active=True
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return schemas.DoctorResponse(
        doctor_id=doctor.doctor_id,
        name=doctor.name,
        specialization=doctor.specialization,
        phone_number=doctor.phone_number,
        email=doctor.email,
        availability_status=doctor.availability_status,
        bio=doctor.bio,
        consultation_fee=doctor.consultation_fee,
        experience_years=doctor.experience_years,
        avatar_url=doctor.avatar_url,
        is_active=doctor.is_active,
        total_appointments=0
    )

@router.get("/{id}", response_model=schemas.DoctorResponse)
def get_doctor_by_id(id: int, db: Session = Depends(get_db)):
    """Get single doctor profile."""
    d = db.query(models.Doctor).filter(models.Doctor.doctor_id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    count = db.query(models.Appointment).filter(models.Appointment.doctor_id == d.doctor_id).count()
    return schemas.DoctorResponse(
        doctor_id=d.doctor_id,
        name=d.name,
        specialization=d.specialization,
        phone_number=d.phone_number,
        email=d.email,
        availability_status=d.availability_status,
        bio=d.bio,
        consultation_fee=d.consultation_fee,
        experience_years=d.experience_years,
        avatar_url=d.avatar_url,
        is_active=d.is_active,
        total_appointments=count
    )

@router.put("/{id}", response_model=schemas.DoctorResponse)
def update_doctor(id: int, req: schemas.DoctorUpdateRequest, db: Session = Depends(get_db)):
    """Update doctor profile."""
    d = db.query(models.Doctor).filter(models.Doctor.doctor_id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if req.name is not None:
        d.name = req.name
    if req.specialization is not None:
        d.specialization = req.specialization
    if req.phone_number is not None:
        d.phone_number = req.phone_number
    if req.bio is not None:
        d.bio = req.bio
    if req.consultation_fee is not None:
        d.consultation_fee = req.consultation_fee
    if req.experience_years is not None:
        d.experience_years = req.experience_years
    if req.availability_status is not None:
        d.availability_status = req.availability_status
    if req.is_active is not None:
        d.is_active = req.is_active
    if req.avatar_url is not None:
        d.avatar_url = req.avatar_url

    db.commit()
    db.refresh(d)
    count = db.query(models.Appointment).filter(models.Appointment.doctor_id == d.doctor_id).count()
    return schemas.DoctorResponse(
        doctor_id=d.doctor_id,
        name=d.name,
        specialization=d.specialization,
        phone_number=d.phone_number,
        email=d.email,
        availability_status=d.availability_status,
        bio=d.bio,
        consultation_fee=d.consultation_fee,
        experience_years=d.experience_years,
        avatar_url=d.avatar_url,
        is_active=d.is_active,
        total_appointments=count
    )

@router.delete("/{id}")
def delete_doctor(id: int, db: Session = Depends(get_db)):
    """Deactivate doctor."""
    d = db.query(models.Doctor).filter(models.Doctor.doctor_id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    d.is_active = False
    d.availability_status = "Unavailable"
    db.commit()
    return {"message": "Doctor deactivated successfully."}
