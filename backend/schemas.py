from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
import datetime

# ----------------- Auth Schemas -----------------
class PatientRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=6, max_length=20)
    gender: str = Field(..., max_length=20)
    date_of_birth: str = Field(..., max_length=20)
    password: str = Field(..., min_length=6, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None # 'patient', 'doctor', 'admin' or None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    specialization: Optional[str] = None
    consultation_fee: Optional[float] = None
    avatar_url: Optional[str] = None

class LoginResponse(BaseModel):
    message: str
    token: str
    user: UserResponse

# ----------------- Patient Schemas -----------------
class PatientResponse(BaseModel):
    patient_id: int
    name: str
    phone_number: str
    email: str
    gender: str
    date_of_birth: str
    is_active: bool
    appointment_count: Optional[int] = 0

    class Config:
        from_attributes = True

class PatientUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    is_active: Optional[bool] = None

# ----------------- Doctor Schemas -----------------
class DoctorCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    specialization: str
    phone_number: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    bio: Optional[str] = None
    consultation_fee: Optional[float] = 60.0
    experience_years: Optional[int] = 5
    avatar_url: Optional[str] = None

class DoctorUpdateRequest(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    experience_years: Optional[int] = None
    availability_status: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None

class DoctorResponse(BaseModel):
    doctor_id: int
    name: str
    specialization: str
    phone_number: str
    email: str
    availability_status: str
    bio: Optional[str] = None
    consultation_fee: float
    experience_years: int
    avatar_url: Optional[str] = None
    is_active: bool
    total_appointments: Optional[int] = 0

    class Config:
        from_attributes = True

# ----------------- Appointment Schemas -----------------
class AppointmentCreateRequest(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: str # YYYY-MM-DD
    appointment_time: str # HH:MM
    reason: str
    notes: Optional[str] = ""

class AppointmentUpdateRequest(BaseModel):
    status: Optional[str] = None # Scheduled, Completed, Cancelled
    notes: Optional[str] = None
    reason: Optional[str] = None

class AppointmentResponse(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str
    status: str
    reason: str
    notes: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    doctor_fee: Optional[float] = None
    doctor_avatar: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Medical Record Schemas -----------------
class MedicalRecordCreateRequest(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    diagnosis: str
    symptoms: str
    treatment: Optional[str] = ""
    record_date: Optional[str] = None

class MedicalRecordResponse(BaseModel):
    record_id: int
    patient_id: int
    doctor_id: Optional[int] = None
    diagnosis: str
    symptoms: str
    treatment: Optional[str] = None
    record_date: str
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Prescription Schemas -----------------
class PrescriptionCreateRequest(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    medicines: str
    dosage: str
    instructions: str
    prescription_date: Optional[str] = None

class PrescriptionResponse(BaseModel):
    prescription_id: int
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    medicines: str
    dosage: str
    instructions: str
    prescription_date: str
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Availability Schemas -----------------
class AvailabilityCreateRequest(BaseModel):
    doctor_id: int
    available_date: str
    start_time: str
    end_time: str
    is_available: Optional[bool] = True

class AvailabilityResponse(BaseModel):
    availability_id: int
    doctor_id: int
    available_date: str
    start_time: str
    end_time: str
    is_available: bool
    is_booked: Optional[bool] = False

    class Config:
        from_attributes = True

# ----------------- Admin Dashboard Schemas -----------------
class AdminDashboardStats(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    pending_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    total_revenue: float
