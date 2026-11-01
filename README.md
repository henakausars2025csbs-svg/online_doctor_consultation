# MediConnect - Online Doctor Consultation Platform

A comprehensive, full-stack, enterprise-grade healthcare consultation web application built with a modern React + TypeScript frontend, SQLite relational database, and dual-backend support (Express.js for the AI Studio live preview container, plus a full Python FastAPI backend implementation in `/backend` with SQLAlchemy and Pydantic).

---

## 1. Demonstration Accounts

The database comes pre-seeded with sample demonstration accounts for each role:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Patient** | John Doe | `john.doe@example.com` | `Patient@123` |
| **Patient** | Emma Watson | `emma.watson@example.com` | `Patient@123` |
| **Doctor** | Dr. Sarah Jenkins (Cardiology) | `dr.sarah@mediconnect.com` | `Doctor@123` |
| **Doctor** | Dr. Robert Shen (Neurology) | `dr.robert@mediconnect.com` | `Doctor@123` |
| **Doctor** | Dr. Emily Watson (Pediatrics) | `dr.emily@mediconnect.com` | `Doctor@123` |
| **Admin** | Super Administrator | `admin@mediconnect.com` | `Admin@123` |

> In the web UI, you can also click the **"Quick Demo Fill"** buttons on the login page or the top demo bar to instantly sign into any role!

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 SPA with TypeScript
- **Styling**: Tailwind CSS v4 with professional healthcare color palette (crisp whites, slate neutrals, deep sky blue accents)
- **Icons**: Lucide Icons
- **Standalone HTML/CSS/JS**: Standalone vanilla frontend is also provided in `/frontend/`

### Backend (Full-Stack & Python FastAPI)
- **Node.js Full-Stack**: Node.js 22 + Express running with built-in native SQLite (`node:sqlite`) and `bcryptjs`
- **Python FastAPI**: Located in `/backend/` with FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2 validation, SQLite, and PBKDF2/bcrypt hashing
- **Database**: SQLite with foreign key enforcement and unique constraints preventing double booking

---

## 3. Database Schema

The SQLite relational database consists of 7 structured tables with primary keys, foreign keys, and unique constraint rules:

1. **`patients`**
   - `patient_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL)
   - `phone_number` (TEXT NOT NULL)
   - `email` (TEXT UNIQUE NOT NULL)
   - `gender` (TEXT NOT NULL)
   - `date_of_birth` (TEXT NOT NULL)
   - `password_hash` (TEXT NOT NULL)
   - `is_active` (INTEGER DEFAULT 1)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

2. **`doctors`**
   - `doctor_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL)
   - `specialization` (TEXT NOT NULL)
   - `phone_number` (TEXT NOT NULL)
   - `email` (TEXT UNIQUE NOT NULL)
   - `password_hash` (TEXT NOT NULL)
   - `availability_status` (TEXT DEFAULT 'Available')
   - `bio` (TEXT)
   - `consultation_fee` (REAL DEFAULT 60.0)
   - `experience_years` (INTEGER DEFAULT 5)
   - `avatar_url` (TEXT)
   - `is_active` (INTEGER DEFAULT 1)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

3. **`admins`**
   - `admin_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL)
   - `email` (TEXT UNIQUE NOT NULL)
   - `password_hash` (TEXT NOT NULL)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

4. **`appointments`**
   - `appointment_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `patient_id` (INTEGER FK -> patients.patient_id)
   - `doctor_id` (INTEGER FK -> doctors.doctor_id)
   - `appointment_date` (TEXT NOT NULL)
   - `appointment_time` (TEXT NOT NULL)
   - `status` (TEXT DEFAULT 'Scheduled') - *Scheduled, Completed, Cancelled*
   - `reason` (TEXT NOT NULL)
   - `notes` (TEXT)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
   - **Constraint**: `UNIQUE(doctor_id, appointment_date, appointment_time)` prevents double booking

5. **`medical_records`**
   - `record_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `patient_id` (INTEGER FK -> patients.patient_id)
   - `doctor_id` (INTEGER FK -> doctors.doctor_id)
   - `diagnosis` (TEXT NOT NULL)
   - `symptoms` (TEXT NOT NULL)
   - `treatment` (TEXT)
   - `record_date` (TEXT NOT NULL)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

6. **`prescriptions`**
   - `prescription_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `patient_id` (INTEGER FK -> patients.patient_id)
   - `doctor_id` (INTEGER FK -> doctors.doctor_id)
   - `appointment_id` (INTEGER FK -> appointments.appointment_id)
   - `medicines` (TEXT NOT NULL)
   - `dosage` (TEXT NOT NULL)
   - `instructions` (TEXT NOT NULL)
   - `prescription_date` (TEXT NOT NULL)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

7. **`doctor_availability`**
   - `availability_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `doctor_id` (INTEGER FK -> doctors.doctor_id)
   - `available_date` (TEXT NOT NULL)
   - `start_time` (TEXT NOT NULL)
   - `end_time` (TEXT NOT NULL)
   - `is_available` (INTEGER DEFAULT 1)
   - **Constraint**: `UNIQUE(doctor_id, available_date, start_time, end_time)`

---

## 4. REST API Documentation

### Authentication
- `POST /api/auth/register` - Register a new patient account with validation and password hashing.
- `POST /api/auth/login` - Sign in as patient, doctor, or administrator.
- `POST /api/auth/logout` - Clear active session.
- `GET /api/auth/me` - Retrieve current authenticated profile.

### Patients
- `GET /api/patients` - Retrieve all registered patient accounts.
- `GET /api/patients/:id` - Fetch single patient details.
- `PUT /api/patients/:id` - Update patient information or activation state.

### Doctors
- `GET /api/doctors` - Retrieve doctors with optional `?search=` and `?specialization=` filters.
- `POST /api/doctors` - Administrator creates a new doctor.
- `GET /api/doctors/:id` - Retrieve doctor profile and visit counts.
- `PUT /api/doctors/:id` - Update doctor profile, consultation fee, or status.
- `DELETE /api/doctors/:id` - Deactivate doctor account.

### Appointments
- `GET /api/appointments` - List appointments with optional `?patient_id=`, `?doctor_id=`, `?status=`, or `?date=`.
- `POST /api/appointments` - Schedule appointment. Validates slot conflicts and prevents double-booking.
- `GET /api/appointments/:id` - Fetch single appointment details with doctor and patient metadata.
- `PUT /api/appointments/:id` - Update status (`Scheduled`, `Completed`, `Cancelled`) and clinical notes.
- `DELETE /api/appointments/:id` - Cancel an appointment.

### Medical Records
- `GET /api/medical-records/:patient_id` - Fetch all medical history entries for a patient.
- `POST /api/medical-records` - Add a diagnosis, symptoms, and treatment record.

### Prescriptions
- `GET /api/prescriptions/:patient_id` - Retrieve digital prescriptions for a patient.
- `POST /api/prescriptions` - Doctor issues a digital prescription linked to an appointment.

### Availability
- `GET /api/availability/:doctor_id` - Fetch available time slots for a doctor with booked status flags.
- `POST /api/availability` - Doctor adds or updates available hours.
- `DELETE /api/availability/:id` - Remove an availability slot.

### Admin
- `GET /api/admin/dashboard` - Real-time counters: total patients, doctors, appointments, pending, completed, revenue.
- `GET /api/admin/reports` - Specialization breakdown, doctor performance, and status summaries.
- `PUT /api/admin/users/:role/:id/status` - Activate or deactivate patient/doctor accounts.

---

## 5. Local Setup & Execution Instructions

### A. Running the Application (Node.js Full-Stack)
```bash
# 1. Install dependencies
npm install

# 2. Run the full-stack application (starts Express on port 3000 + Vite client)
npm run dev

# 3. Open in browser
# http://localhost:3000
```

### B. Running with Python FastAPI (Windows PowerShell)
Open **Windows PowerShell** in the project directory:

```powershell
# 1. Create a Python virtual environment
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. (Optional) Seed the database with sample data
python -m backend.seed_data

# 5. Start the FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running:
- **FastAPI API & Static Frontend**: http://127.0.0.1:8000
- **Interactive Swagger Documentation**: http://127.0.0.1:8000/docs
- **Alternative ReDoc UI**: http://127.0.0.1:8000/redoc

### C. Running with Python FastAPI (macOS / Linux)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python3 -m backend.seed_data
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 6. End-to-End Testing Workflows

1. **Patient Booking Workflow**:
   - Log in as `john.doe@example.com` (`Patient@123`).
   - Click "Find Specialists", select **Dr. Sarah Jenkins** (Cardiology).
   - Click "Book Consultation", select tomorrow's date.
   - Pick an open time slot (e.g. `11:00`), enter symptom reason, and click "Confirm Appointment".
   - Notice the appointment is immediately added to "My Scheduled & Past Appointments".
   - If you or another patient try to select the same slot for Dr. Sarah Jenkins, the slot is locked and double-booking is rejected.

2. **Doctor Consultation Workflow**:
   - Log in as `dr.sarah@mediconnect.com` (`Doctor@123`).
   - On the Doctor Workspace, see today's and scheduled appointments.
   - Click **"Prescribe & Complete"** on the patient's appointment.
   - Enter diagnosis, prescribed medicines (e.g., *Metoprolol 25mg*), dosage, and instructions.
   - Click "Save & Complete Consultation".
   - The appointment status turns to **Completed**, and a formal prescription is generated.

3. **Admin Monitoring Workflow**:
   - Log in as `admin@mediconnect.com` (`Admin@123`).
   - Check real-time KPI cards: Total Patients, Total Doctors, Appointments, Revenue.
   - Open **Doctors Management** to view physicians or register a new doctor with custom specialty and fee.
   - Open **Reports & Analytics** to observe clinical performance by department and doctor.
