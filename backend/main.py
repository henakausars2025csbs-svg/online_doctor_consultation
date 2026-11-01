import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models, schemas, auth
from .routers import patients, doctors, appointments, medical_records, prescriptions, availability, admin

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Online Doctor Consultation Platform API",
    description="REST API for Doctor Consultation, Patient Booking, Medical Records and Administrative Monitoring",
    version="1.0.0"
)

# Enable CORS for flexible local and cross-origin development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Root & Auth Endpoints -----------------

@app.post("/api/auth/register", response_model=schemas.LoginResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_patient(req: schemas.PatientRegisterRequest, db: Session = Depends(get_db)):
    """Register a new patient account."""
    # Check duplicate email
    if db.query(models.Patient).filter(models.Patient.email == req.email).first() or \
       db.query(models.Doctor).filter(models.Doctor.email == req.email).first() or \
       db.query(models.Admin).filter(models.Admin.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    patient = models.Patient(
        name=req.name,
        email=req.email,
        phone_number=req.phone_number,
        gender=req.gender,
        date_of_birth=req.date_of_birth,
        password_hash=auth.hash_password(req.password),
        is_active=True
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    user_resp = schemas.UserResponse(
        id=patient.patient_id,
        name=patient.name,
        email=patient.email,
        role="patient",
        phone_number=patient.phone_number,
        gender=patient.gender,
        date_of_birth=patient.date_of_birth
    )

    return schemas.LoginResponse(
        message="Registration successful! Welcome to MediConnect.",
        token=f"auth_token_patient_{patient.patient_id}",
        user=user_resp
    )

@app.post("/api/auth/login", response_model=schemas.LoginResponse, tags=["Authentication"])
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Authenticate patient, doctor, or admin."""
    # Check Admin
    if req.role == "admin" or not req.role:
        admin = db.query(models.Admin).filter(models.Admin.email == req.email).first()
        if admin and auth.verify_password(req.password, admin.password_hash):
            return schemas.LoginResponse(
                message="Admin login successful",
                token=f"token_admin_{admin.admin_id}",
                user=schemas.UserResponse(
                    id=admin.admin_id,
                    name=admin.name,
                    email=admin.email,
                    role="admin"
                )
            )

    # Check Doctor
    if req.role == "doctor" or not req.role:
        doctor = db.query(models.Doctor).filter(models.Doctor.email == req.email).first()
        if doctor and auth.verify_password(req.password, doctor.password_hash):
            if not doctor.is_active:
                raise HTTPException(status_code=403, detail="Doctor account is deactivated. Please contact admin.")
            return schemas.LoginResponse(
                message="Doctor login successful",
                token=f"token_doctor_{doctor.doctor_id}",
                user=schemas.UserResponse(
                    id=doctor.doctor_id,
                    name=doctor.name,
                    email=doctor.email,
                    role="doctor",
                    phone_number=doctor.phone_number,
                    specialization=doctor.specialization,
                    consultation_fee=doctor.consultation_fee,
                    avatar_url=doctor.avatar_url
                )
            )

    # Check Patient
    if req.role == "patient" or not req.role:
        patient = db.query(models.Patient).filter(models.Patient.email == req.email).first()
        if patient and auth.verify_password(req.password, patient.password_hash):
            if not patient.is_active:
                raise HTTPException(status_code=403, detail="Patient account is deactivated. Please contact admin.")
            return schemas.LoginResponse(
                message="Patient login successful",
                token=f"token_patient_{patient.patient_id}",
                user=schemas.UserResponse(
                    id=patient.patient_id,
                    name=patient.name,
                    email=patient.email,
                    role="patient",
                    phone_number=patient.phone_number,
                    gender=patient.gender,
                    date_of_birth=patient.date_of_birth
                )
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email address or password."
    )

@app.post("/api/auth/logout", tags=["Authentication"])
def logout():
    """Logout current session."""
    return {"message": "Logged out successfully."}

@app.get("/api/auth/me", tags=["Authentication"])
def get_me(user: dict = Depends(auth.get_current_user_from_headers)):
    """Get active authenticated session details."""
    return {"user": user}

# Include all module routers
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(medical_records.router)
app.include_router(prescriptions.router)
app.include_router(availability.router)
app.include_router(admin.router)

# Static Frontend Mount if frontend/ directory exists
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    def serve_frontend():
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "MediConnect Doctor Consultation API is online. Visit /docs for interactive Swagger UI."}
