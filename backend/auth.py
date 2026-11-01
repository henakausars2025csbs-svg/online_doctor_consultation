import hashlib
import os
import hmac
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models

# Secure salt-based PBKDF2 hashing compatible with standard python hashlib
SECRET_KEY = os.getenv("SECRET_KEY", "mediconnect-super-secure-production-secret-key-2026")

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 HMAC SHA256 with random salt."""
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        100000
    ).hex()
    return f"{salt}${key}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt$hash or bcrypt format."""
    try:
        # Check if stored as salt$hash
        if "$" in hashed_password and not hashed_password.startswith("$2"):
            salt, key = hashed_password.split("$", 1)
            new_key = hashlib.pbkdf2_hmac(
                'sha256',
                plain_password.encode('utf-8'),
                bytes.fromhex(salt),
                100000
            ).hex()
            return hmac.compare_digest(key, new_key)
        
        # Or bcrypt fallback if passlib is installed
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False
    except Exception:
        return False

def get_current_user_from_headers(
    x_user_role: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Extracts authenticated user from request headers."""
    if not x_user_role or not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication headers required (x-user-role, x-user-id)."
        )

    try:
        uid = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID format.")

    if x_user_role == "patient":
        user = db.query(models.Patient).filter(models.Patient.patient_id == uid).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or non-existent patient.")
        return {"id": user.patient_id, "name": user.name, "email": user.email, "role": "patient"}

    elif x_user_role == "doctor":
        user = db.query(models.Doctor).filter(models.Doctor.doctor_id == uid).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or non-existent doctor.")
        return {"id": user.doctor_id, "name": user.name, "email": user.email, "role": "doctor"}

    elif x_user_role == "admin":
        user = db.query(models.Admin).filter(models.Admin.admin_id == uid).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non-existent admin account.")
        return {"id": user.admin_id, "name": user.name, "email": user.email, "role": "admin"}

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown role provided.")

def require_admin(current_user: Dict[str, Any] = Depends(get_current_user_from_headers)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
    return current_user

def require_doctor(current_user: Dict[str, Any] = Depends(get_current_user_from_headers)):
    if current_user.get("role") != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor privileges required.")
    return current_user

def require_patient(current_user: Dict[str, Any] = Depends(get_current_user_from_headers)):
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient privileges required.")
    return current_user
