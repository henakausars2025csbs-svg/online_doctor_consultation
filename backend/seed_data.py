"""
Database initialization and seeding script for Online Doctor Consultation Platform.
Creates tables and inserts sample patients, doctors, admin, availability slots, and records.
"""
import datetime
from .database import engine, Base, SessionLocal
from . import models, auth

def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(models.Admin).first():
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding initial database records...")

        # 1. Admin
        admin = models.Admin(
            name="Super Admin",
            email="admin@mediconnect.com",
            password_hash=auth.hash_password("Admin@123")
        )
        db.add(admin)

        # 2. Doctors
        doc1 = models.Doctor(
            name="Dr. Sarah Jenkins",
            specialization="Cardiology",
            phone_number="+1 (555) 234-5678",
            email="dr.sarah@mediconnect.com",
            password_hash=auth.hash_password("Doctor@123"),
            availability_status="Available",
            bio="Board-certified Cardiologist with 12+ years experience in preventive cardiac care and hypertension management.",
            consultation_fee=120.0,
            experience_years=12,
            avatar_url="/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg",
            is_active=True
        )

        doc2 = models.Doctor(
            name="Dr. Robert Shen",
            specialization="Neurology",
            phone_number="+1 (555) 345-6789",
            email="dr.robert@mediconnect.com",
            password_hash=auth.hash_password("Doctor@123"),
            availability_status="Available",
            bio="Senior Neurologist expert in treating migraines, neuropathy, chronic neuro-degenerative conditions, and sleep disorders.",
            consultation_fee=150.0,
            experience_years=16,
            avatar_url="/src/assets/images/doctor_dr_robert_avatar_1793515596946.jpg",
            is_active=True
        )

        doc3 = models.Doctor(
            name="Dr. Emily Watson",
            specialization="Pediatrics",
            phone_number="+1 (555) 456-7890",
            email="dr.emily@mediconnect.com",
            password_hash=auth.hash_password("Doctor@123"),
            availability_status="Available",
            bio="Dedicated Pediatrician passionate about child growth, preventive immunizations, adolescent medicine, and family-centered pediatric care.",
            consultation_fee=90.0,
            experience_years=9,
            avatar_url="/src/assets/images/doctor_dr_emily_avatar_1793515596424.jpg",
            is_active=True
        )

        db.add_all([doc1, doc2, doc3])
        db.commit()

        # 3. Patients
        p1 = models.Patient(
            name="John Doe",
            phone_number="+1 (555) 111-2233",
            email="john.doe@example.com",
            gender="Male",
            date_of_birth="1990-05-14",
            password_hash=auth.hash_password("Patient@123"),
            is_active=True
        )

        p2 = models.Patient(
            name="Emma Watson",
            phone_number="+1 (555) 222-3344",
            email="emma.watson@example.com",
            gender="Female",
            date_of_birth="1995-09-22",
            password_hash=auth.hash_password("Patient@123"),
            is_active=True
        )

        db.add_all([p1, p2])
        db.commit()

        # 4. Doctor Availability
        today = datetime.date.today().isoformat()
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
        day_after = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()

        time_slots = [
            ("09:00", "09:30"),
            ("09:30", "10:00"),
            ("10:00", "10:30"),
            ("11:00", "11:30"),
            ("14:00", "14:30"),
            ("15:00", "15:30"),
            ("16:00", "16:30"),
        ]

        avail_entries = []
        for doc in [doc1, doc2, doc3]:
            for d in [today, tomorrow, day_after]:
                for st, et in time_slots:
                    avail_entries.append(models.DoctorAvailability(
                        doctor_id=doc.doctor_id,
                        available_date=d,
                        start_time=st,
                        end_time=et,
                        is_available=True
                    ))
        db.add_all(avail_entries)
        db.commit()

        # 5. Initial Appointments
        appt1 = models.Appointment(
            patient_id=p1.patient_id,
            doctor_id=doc1.doctor_id,
            appointment_date=today,
            appointment_time="09:00",
            status="Scheduled",
            reason="Routine cardiac review and occasional palpitations",
            notes="Patient reports mild stress at work"
        )

        appt2 = models.Appointment(
            patient_id=p1.patient_id,
            doctor_id=doc2.doctor_id,
            appointment_date=tomorrow,
            appointment_time="10:00",
            status="Scheduled",
            reason="Tension headache consultations and sleep hygiene evaluation",
            notes="Follow-up regarding sleep schedule"
        )

        appt3 = models.Appointment(
            patient_id=p2.patient_id,
            doctor_id=doc3.doctor_id,
            appointment_date=today,
            appointment_time="14:00",
            status="Completed",
            reason="Annual pediatric checkup and growth milestone assessment",
            notes="Normal development indicators"
        )

        db.add_all([appt1, appt2, appt3])
        db.commit()

        # 6. Medical Records
        rec1 = models.MedicalRecord(
            patient_id=p1.patient_id,
            doctor_id=doc1.doctor_id,
            diagnosis="Mild Essential Hypertension",
            symptoms="Occasional dizziness, elevated BP 138/88 mmHg",
            treatment="Dietary salt reduction, 30 min daily walking, monitor blood pressure weekly",
            record_date="2026-10-15"
        )
        rec2 = models.MedicalRecord(
            patient_id=p2.patient_id,
            doctor_id=doc3.doctor_id,
            diagnosis="Seasonal Allergic Rhinitis",
            symptoms="Sneezing, nasal congestion, mild watery eyes",
            treatment="Saline nasal rinse, non-drowsy antihistamine during seasonal pollen peaks",
            record_date="2026-10-20"
        )
        db.add_all([rec1, rec2])

        # 7. Prescriptions
        rx1 = models.Prescription(
            patient_id=p1.patient_id,
            doctor_id=doc1.doctor_id,
            appointment_id=appt1.appointment_id,
            medicines="Amlodipine 5mg, Omega-3 Fish Oil 1000mg",
            dosage="Take 1 tablet Amlodipine daily morning; Take 1 capsule Omega-3 with dinner",
            instructions="Drink plenty of water. Check blood pressure twice weekly. Avoid excessive sodium.",
            prescription_date=today
        )
        rx2 = models.Prescription(
            patient_id=p2.patient_id,
            doctor_id=doc3.doctor_id,
            appointment_id=appt3.appointment_id,
            medicines="Cetirizine 5mg syrup, Multivitamin Gummies",
            dosage="5ml Cetirizine once before bedtime; 1 gummy daily with breakfast",
            instructions="Continue for 7 days or until symptoms subside.",
            prescription_date=today
        )
        db.add_all([rx1, rx2])
        db.commit()

        print("Database seeded successfully with sample accounts and data.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
