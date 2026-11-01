import express, { Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'doctor_consultation.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    gender TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    availability_status TEXT DEFAULT 'Available',
    bio TEXT,
    consultation_fee REAL DEFAULT 50.0,
    experience_years INTEGER DEFAULT 5,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    reason TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE(doctor_id, appointment_date, appointment_time)
  );

  CREATE TABLE IF NOT EXISTS medical_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER,
    diagnosis TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    treatment TEXT,
    record_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    medicines TEXT NOT NULL,
    dosage TEXT NOT NULL,
    instructions TEXT NOT NULL,
    prescription_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS doctor_availability (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    available_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE(doctor_id, available_date, start_time, end_time)
  );
`);

// Seed initial data if empty
function seedDatabase() {
  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (adminCheck.count === 0) {
    console.log('Seeding initial demonstration data...');
    const hashedAdminPw = bcrypt.hashSync('Admin@123', 10);
    const hashedDoctorPw = bcrypt.hashSync('Doctor@123', 10);
    const hashedPatientPw = bcrypt.hashSync('Patient@123', 10);

    // Admin
    db.prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)')
      .run('Super Admin', 'admin@mediconnect.com', hashedAdminPw);

    // Doctors with generated studio avatars
    const insertDoc = db.prepare(`
      INSERT INTO doctors (name, specialization, phone_number, email, password_hash, availability_status, bio, consultation_fee, experience_years, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDoc.run(
      'Dr. Sarah Jenkins',
      'Cardiology',
      '+1 (555) 234-5678',
      'dr.sarah@mediconnect.com',
      hashedDoctorPw,
      'Available',
      'Board-certified Cardiologist with over 12 years of experience specializing in cardiovascular health, preventive cardiology, and hypertension management.',
      120.0,
      12,
      '/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg'
    );

    insertDoc.run(
      'Dr. Robert Shen',
      'Neurology',
      '+1 (555) 345-6789',
      'dr.robert@mediconnect.com',
      hashedDoctorPw,
      'Available',
      'Senior Neurologist expert in treating migraines, neuropathy, chronic neuro-degenerative conditions, and sleep-related neurological disorders.',
      150.0,
      16,
      '/src/assets/images/doctor_dr_robert_avatar_1793515596946.jpg'
    );

    insertDoc.run(
      'Dr. Emily Watson',
      'Pediatrics',
      '+1 (555) 456-7890',
      'dr.emily@mediconnect.com',
      hashedDoctorPw,
      'Available',
      'Dedicated Pediatrician passionate about child growth, preventive immunizations, adolescent medicine, and family-centered pediatric care.',
      90.0,
      9,
      '/src/assets/images/doctor_dr_emily_avatar_1793515596424.jpg'
    );

    // Patients
    const insertPatient = db.prepare(`
      INSERT INTO patients (name, phone_number, email, gender, date_of_birth, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertPatient.run('John Doe', '+1 (555) 111-2233', 'john.doe@example.com', 'Male', '1990-05-14', hashedPatientPw);
    insertPatient.run('Emma Watson', '+1 (555) 222-3344', 'emma.watson@example.com', 'Female', '1995-09-22', hashedPatientPw);

    // Doctor Availability Slots (today and upcoming days)
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

    const insertSlot = db.prepare(`
      INSERT OR IGNORE INTO doctor_availability (doctor_id, available_date, start_time, end_time, is_available)
      VALUES (?, ?, ?, ?, 1)
    `);

    const timeSlots = [
      ['09:00', '09:30'],
      ['09:30', '10:00'],
      ['10:00', '10:30'],
      ['11:00', '11:30'],
      ['14:00', '14:30'],
      ['15:00', '15:30'],
      ['16:00', '16:30']
    ];

    for (let docId = 1; docId <= 3; docId++) {
      for (const d of [today, tomorrow, dayAfter]) {
        for (const [st, et] of timeSlots) {
          insertSlot.run(docId, d, st, et);
        }
      }
    }

    // Sample Appointments
    const insertAppt = db.prepare(`
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAppt.run(1, 1, today, '09:00', 'Scheduled', 'Routine cardiac health review and occasional palpitations', 'Patient reports mild stress at work');
    insertAppt.run(1, 2, tomorrow, '10:00', 'Scheduled', 'Persistent tension headache consultations', 'Follow-up regarding sleep schedule');
    insertAppt.run(2, 3, today, '14:00', 'Completed', 'Annual pediatric checkup and growth milestone assessment', 'Normal development indicators');

    // Sample Medical Records
    const insertRecord = db.prepare(`
      INSERT INTO medical_records (patient_id, doctor_id, diagnosis, symptoms, treatment, record_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertRecord.run(
      1,
      1,
      'Mild Essential Hypertension',
      'Occasional dizziness, elevated BP 138/88 mmHg',
      'Dietary salt reduction, 30 min daily walking, monitor blood pressure weekly',
      '2026-10-15'
    );

    insertRecord.run(
      2,
      3,
      'Seasonal Allergic Rhinitis',
      'Sneezing, nasal congestion, mild watery eyes',
      'Saline nasal rinse, non-drowsy antihistamine during seasonal pollen peaks',
      '2026-10-20'
    );

    // Sample Prescriptions
    const insertRx = db.prepare(`
      INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, medicines, dosage, instructions, prescription_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertRx.run(
      1,
      1,
      1,
      'Amlodipine 5mg, Omega-3 Fish Oil 1000mg',
      'Take 1 tablet Amlodipine daily morning; Take 1 capsule Omega-3 with dinner',
      'Drink plenty of water. Check blood pressure twice weekly. Avoid excessive sodium.',
      today
    );

    insertRx.run(
      2,
      3,
      3,
      'Cetirizine 5mg syrup, Multivitamin Gummies',
      '5ml Cetirizine once before bedtime; 1 gummy daily with breakfast',
      'Continue for 7 days or until symptoms subside.',
      today
    );

    console.log('Seeding completed successfully!');
  }
}

seedDatabase();

// ----------------------------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------------------------

// 1. Authentication Endpoints
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, phone_number, gender, date_of_birth, password } = req.body;

    if (!name || !email || !phone_number || !gender || !date_of_birth || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check email uniqueness across patients, doctors, admins
    const existingPatient = db.prepare('SELECT email FROM patients WHERE email = ?').get(email);
    const existingDoctor = db.prepare('SELECT email FROM doctors WHERE email = ?').get(email);
    const existingAdmin = db.prepare('SELECT email FROM admins WHERE email = ?').get(email);

    if (existingPatient || existingDoctor || existingAdmin) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const insert = db.prepare(`
      INSERT INTO patients (name, phone_number, email, gender, date_of_birth, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(name, phone_number, email, gender, date_of_birth, password_hash);

    const user = {
      id: Number(result.lastInsertRowid),
      name,
      email,
      role: 'patient',
      phone_number,
      gender,
      date_of_birth
    };

    return res.status(201).json({
      message: 'Registration successful! You can now log in.',
      user
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let foundUser: any = null;
    let detectedRole = '';

    // Check if role is specified, otherwise check all roles
    if (role === 'admin' || !role) {
      const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email) as any;
      if (admin && bcrypt.compareSync(password, admin.password_hash)) {
        foundUser = {
          id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: 'admin'
        };
        detectedRole = 'admin';
      }
    }

    if (!foundUser && (role === 'doctor' || !role)) {
      const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email) as any;
      if (doctor && bcrypt.compareSync(password, doctor.password_hash)) {
        if (doctor.is_active === 0) {
          return res.status(403).json({ error: 'Your doctor account has been deactivated. Please contact administrator.' });
        }
        foundUser = {
          id: doctor.doctor_id,
          name: doctor.name,
          email: doctor.email,
          role: 'doctor',
          specialization: doctor.specialization,
          phone_number: doctor.phone_number,
          consultation_fee: doctor.consultation_fee,
          avatar_url: doctor.avatar_url
        };
        detectedRole = 'doctor';
      }
    }

    if (!foundUser && (role === 'patient' || !role)) {
      const patient = db.prepare('SELECT * FROM patients WHERE email = ?').get(email) as any;
      if (patient && bcrypt.compareSync(password, patient.password_hash)) {
        if (patient.is_active === 0) {
          return res.status(403).json({ error: 'Your patient account has been deactivated. Please contact administrator.' });
        }
        foundUser = {
          id: patient.patient_id,
          name: patient.name,
          email: patient.email,
          role: 'patient',
          phone_number: patient.phone_number,
          gender: patient.gender,
          date_of_birth: patient.date_of_birth
        };
        detectedRole = 'patient';
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: `auth_token_${detectedRole}_${foundUser.id}_${Date.now()}`,
      user: foundUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login: ' + error.message });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  return res.status(200).json({ message: 'Successfully logged out.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const role = req.headers['x-user-role'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!role || !userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    if (role === 'patient') {
      const patient = db.prepare('SELECT patient_id as id, name, email, phone_number, gender, date_of_birth, is_active FROM patients WHERE patient_id = ?').get(userId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      return res.json({ user: { ...patient, role: 'patient' } });
    } else if (role === 'doctor') {
      const doctor = db.prepare('SELECT doctor_id as id, name, email, phone_number, specialization, availability_status, bio, consultation_fee, experience_years, avatar_url, is_active FROM doctors WHERE doctor_id = ?').get(userId);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
      return res.json({ user: { ...doctor, role: 'doctor' } });
    } else if (role === 'admin') {
      const admin = db.prepare('SELECT admin_id as id, name, email FROM admins WHERE admin_id = ?').get(userId);
      if (!admin) return res.status(404).json({ error: 'Admin not found' });
      return res.json({ user: { ...admin, role: 'admin' } });
    }

    return res.status(400).json({ error: 'Unknown role' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Patient Endpoints
app.get('/api/patients', (req: Request, res: Response) => {
  try {
    const patients = db.prepare(`
      SELECT patient_id, name, phone_number, email, gender, date_of_birth, is_active, created_at,
      (SELECT COUNT(*) FROM appointments WHERE appointments.patient_id = patients.patient_id) as appointment_count
      FROM patients
      ORDER BY patient_id DESC
    `).all();
    return res.json(patients);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const patient = db.prepare(`
      SELECT patient_id, name, phone_number, email, gender, date_of_birth, is_active, created_at
      FROM patients WHERE patient_id = ?
    `).get(req.params.id);

    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    return res.json(patient);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const { name, phone_number, gender, date_of_birth, is_active } = req.body;
    const current = db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Patient not found' });

    db.prepare(`
      UPDATE patients
      SET name = COALESCE(?, name),
          phone_number = COALESCE(?, phone_number),
          gender = COALESCE(?, gender),
          date_of_birth = COALESCE(?, date_of_birth),
          is_active = COALESCE(?, is_active)
      WHERE patient_id = ?
    `).run(name, phone_number, gender, date_of_birth, is_active, req.params.id);

    const updated = db.prepare('SELECT patient_id, name, phone_number, email, gender, date_of_birth, is_active FROM patients WHERE patient_id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Doctor Endpoints
app.get('/api/doctors', (req: Request, res: Response) => {
  try {
    const { search, specialization } = req.query;
    let query = `
      SELECT doctor_id, name, specialization, phone_number, email, availability_status, bio,
             consultation_fee, experience_years, avatar_url, is_active, created_at,
             (SELECT COUNT(*) FROM appointments WHERE appointments.doctor_id = doctors.doctor_id) as total_appointments
      FROM doctors
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (name LIKE ? OR specialization LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (specialization && specialization !== 'All') {
      query += ` AND specialization = ?`;
      params.push(specialization);
    }

    query += ` ORDER BY name ASC`;

    const doctors = db.prepare(query).all(...params);
    return res.json(doctors);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/doctors', (req: Request, res: Response) => {
  try {
    const { name, specialization, phone_number, email, password, bio, consultation_fee, experience_years, avatar_url } = req.body;

    if (!name || !specialization || !phone_number || !email || !password) {
      return res.status(400).json({ error: 'Name, specialization, phone number, email, and password are required.' });
    }

    const existingDoctor = db.prepare('SELECT email FROM doctors WHERE email = ?').get(email);
    if (existingDoctor) {
      return res.status(409).json({ error: 'A doctor with this email already exists.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const insert = db.prepare(`
      INSERT INTO doctors (name, specialization, phone_number, email, password_hash, bio, consultation_fee, experience_years, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name,
      specialization,
      phone_number,
      email,
      password_hash,
      bio || 'Specialist healthcare provider dedicated to quality medical care.',
      consultation_fee || 75.0,
      experience_years || 5,
      avatar_url || '/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg'
    );

    const newDocId = Number(result.lastInsertRowid);

    // Auto-create initial availability slots for today and next 2 days
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const insertSlot = db.prepare('INSERT OR IGNORE INTO doctor_availability (doctor_id, available_date, start_time, end_time, is_available) VALUES (?, ?, ?, ?, 1)');
    for (const d of [today, tomorrow]) {
      insertSlot.run(newDocId, d, '09:00', '09:30');
      insertSlot.run(newDocId, d, '10:00', '10:30');
      insertSlot.run(newDocId, d, '14:00', '14:30');
      insertSlot.run(newDocId, d, '15:00', '15:30');
    }

    const doctor = db.prepare('SELECT doctor_id, name, specialization, phone_number, email, availability_status, bio, consultation_fee, experience_years, avatar_url, is_active FROM doctors WHERE doctor_id = ?').get(newDocId);
    return res.status(201).json(doctor);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/doctors/:id', (req: Request, res: Response) => {
  try {
    const doctor = db.prepare(`
      SELECT doctor_id, name, specialization, phone_number, email, availability_status, bio,
             consultation_fee, experience_years, avatar_url, is_active, created_at,
             (SELECT COUNT(*) FROM appointments WHERE appointments.doctor_id = doctors.doctor_id) as total_appointments
      FROM doctors WHERE doctor_id = ?
    `).get(req.params.id);

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    return res.json(doctor);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/doctors/:id', (req: Request, res: Response) => {
  try {
    const { name, specialization, phone_number, bio, consultation_fee, experience_years, availability_status, is_active, avatar_url } = req.body;
    db.prepare(`
      UPDATE doctors
      SET name = COALESCE(?, name),
          specialization = COALESCE(?, specialization),
          phone_number = COALESCE(?, phone_number),
          bio = COALESCE(?, bio),
          consultation_fee = COALESCE(?, consultation_fee),
          experience_years = COALESCE(?, experience_years),
          availability_status = COALESCE(?, availability_status),
          is_active = COALESCE(?, is_active),
          avatar_url = COALESCE(?, avatar_url)
      WHERE doctor_id = ?
    `).run(name, specialization, phone_number, bio, consultation_fee, experience_years, availability_status, is_active, avatar_url, req.params.id);

    const updated = db.prepare('SELECT doctor_id, name, specialization, phone_number, email, availability_status, bio, consultation_fee, experience_years, avatar_url, is_active FROM doctors WHERE doctor_id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/doctors/:id', (req: Request, res: Response) => {
  try {
    // Soft delete or de-activate
    db.prepare("UPDATE doctors SET is_active = 0, availability_status = 'Unavailable' WHERE doctor_id = ?").run(req.params.id);
    return res.json({ message: 'Doctor deactivated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Appointments Endpoints
app.get('/api/appointments', (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, status, date } = req.query;
    let query = `
      SELECT a.appointment_id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
             a.status, a.reason, a.notes, a.created_at,
             p.name as patient_name, p.email as patient_email, p.phone_number as patient_phone, p.gender as patient_gender, p.date_of_birth as patient_dob,
             d.name as doctor_name, d.specialization as doctor_specialization, d.consultation_fee as doctor_fee, d.avatar_url as doctor_avatar
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (patient_id) {
      query += ` AND a.patient_id = ?`;
      params.push(patient_id);
    }
    if (doctor_id) {
      query += ` AND a.doctor_id = ?`;
      params.push(doctor_id);
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (date) {
      query += ` AND a.appointment_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;

    const appointments = db.prepare(query).all(...params);
    return res.json(appointments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason, notes } = req.body;

    if (!patient_id || !doctor_id || !appointment_date || !appointment_time || !reason) {
      return res.status(400).json({ error: 'Patient ID, Doctor ID, date, time slot, and reason are required.' });
    }

    // Double-booking check: verify whether this doctor is already booked for this slot
    const existing = db.prepare(`
      SELECT appointment_id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'
    `).get(doctor_id, appointment_date, appointment_time);

    if (existing) {
      return res.status(409).json({ error: 'This time slot is already booked for this doctor. Please select another slot.' });
    }

    // Patient overlap check: verify patient doesn't already have an appointment at the same date and time
    const patientConflict = db.prepare(`
      SELECT appointment_id FROM appointments
      WHERE patient_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'
    `).get(patient_id, appointment_date, appointment_time);

    if (patientConflict) {
      return res.status(409).json({ error: 'You already have another active appointment scheduled at this date and time.' });
    }

    const insert = db.prepare(`
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
      VALUES (?, ?, ?, ?, 'Scheduled', ?, ?)
    `);

    const result = insert.run(patient_id, doctor_id, appointment_date, appointment_time, reason, notes || '');
    const appointment_id = Number(result.lastInsertRowid);

    // Fetch the created appointment with join details
    const appt = db.prepare(`
      SELECT a.*, p.name as patient_name, d.name as doctor_name, d.specialization as doctor_specialization, d.consultation_fee
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id = ?
    `).get(appointment_id);

    return res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment: appt
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments/:id', (req: Request, res: Response) => {
  try {
    const appt = db.prepare(`
      SELECT a.*, p.name as patient_name, p.email as patient_email, p.phone_number as patient_phone,
             d.name as doctor_name, d.specialization as doctor_specialization, d.consultation_fee, d.avatar_url as doctor_avatar
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id = ?
    `).get(req.params.id);

    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    return res.json(appt);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', (req: Request, res: Response) => {
  try {
    const { status, notes, reason } = req.body;
    const current = db.prepare('SELECT * FROM appointments WHERE appointment_id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Appointment not found' });

    db.prepare(`
      UPDATE appointments
      SET status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          reason = COALESCE(?, reason)
      WHERE appointment_id = ?
    `).run(status, notes, reason, req.params.id);

    const updated = db.prepare(`
      SELECT a.*, p.name as patient_name, d.name as doctor_name, d.specialization as doctor_specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id = ?
    `).get(req.params.id);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', (req: Request, res: Response) => {
  try {
    // Cancellation endpoint
    db.prepare("UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = ?").run(req.params.id);
    return res.json({ message: 'Appointment cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Medical Records Endpoints
app.get('/api/medical-records/:patient_id', (req: Request, res: Response) => {
  try {
    const records = db.prepare(`
      SELECT mr.*, d.name as doctor_name, d.specialization as doctor_specialization
      FROM medical_records mr
      LEFT JOIN doctors d ON mr.doctor_id = d.doctor_id
      WHERE mr.patient_id = ?
      ORDER BY mr.record_date DESC, mr.record_id DESC
    `).all(req.params.patient_id);

    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/medical-records', (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, diagnosis, symptoms, treatment, record_date } = req.body;

    if (!patient_id || !diagnosis || !symptoms) {
      return res.status(400).json({ error: 'Patient ID, diagnosis, and symptoms are required.' });
    }

    const date = record_date || new Date().toISOString().split('T')[0];

    const insert = db.prepare(`
      INSERT INTO medical_records (patient_id, doctor_id, diagnosis, symptoms, treatment, record_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(patient_id, doctor_id || null, diagnosis, symptoms, treatment || '', date);

    const record = db.prepare(`
      SELECT mr.*, d.name as doctor_name, d.specialization as doctor_specialization
      FROM medical_records mr
      LEFT JOIN doctors d ON mr.doctor_id = d.doctor_id
      WHERE mr.record_id = ?
    `).get(Number(result.lastInsertRowid));

    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Prescriptions Endpoints
app.get('/api/prescriptions/:patient_id', (req: Request, res: Response) => {
  try {
    const prescriptions = db.prepare(`
      SELECT pr.*, d.name as doctor_name, d.specialization as doctor_specialization, d.phone_number as doctor_phone
      FROM prescriptions pr
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      WHERE pr.patient_id = ?
      ORDER BY pr.prescription_date DESC, pr.prescription_id DESC
    `).all(req.params.patient_id);

    return res.json(prescriptions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/prescriptions', (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, appointment_id, medicines, dosage, instructions, prescription_date } = req.body;

    if (!patient_id || !doctor_id || !medicines || !dosage || !instructions) {
      return res.status(400).json({ error: 'Patient ID, Doctor ID, medicines, dosage, and instructions are required.' });
    }

    const date = prescription_date || new Date().toISOString().split('T')[0];

    const insert = db.prepare(`
      INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, medicines, dosage, instructions, prescription_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(patient_id, doctor_id, appointment_id || null, medicines, dosage, instructions, date);

    // If linked to appointment, optionally mark appointment as completed
    if (appointment_id) {
      db.prepare("UPDATE appointments SET status = 'Completed' WHERE appointment_id = ?").run(appointment_id);
    }

    const prescription = db.prepare(`
      SELECT pr.*, d.name as doctor_name, d.specialization as doctor_specialization
      FROM prescriptions pr
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      WHERE pr.prescription_id = ?
    `).get(Number(result.lastInsertRowid));

    return res.status(201).json(prescription);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Doctor Availability Endpoints
app.get('/api/availability/:doctor_id', (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT availability_id, doctor_id, available_date, start_time, end_time, is_available
      FROM doctor_availability
      WHERE doctor_id = ? AND is_available = 1
    `;
    const params: any[] = [req.params.doctor_id];

    if (date) {
      query += ` AND available_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY available_date ASC, start_time ASC`;

    const slots = db.prepare(query).all(...params) as any[];

    // Check which of these slots are already booked by existing active appointments
    const booked = db.prepare(`
      SELECT appointment_date, appointment_time
      FROM appointments
      WHERE doctor_id = ? AND status != 'Cancelled'
    `).all(req.params.doctor_id) as any[];

    const bookedMap = new Set(booked.map(b => `${b.appointment_date}_${b.appointment_time}`));

    const enrichedSlots = slots.map(slot => ({
      ...slot,
      is_booked: bookedMap.has(`${slot.available_date}_${slot.start_time}`)
    }));

    return res.json(enrichedSlots);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/availability', (req: Request, res: Response) => {
  try {
    const { doctor_id, available_date, start_time, end_time, is_available } = req.body;

    if (!doctor_id || !available_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Doctor ID, date, start time, and end time are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO doctor_availability (doctor_id, available_date, start_time, end_time, is_available)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(doctor_id, available_date, start_time, end_time)
      DO UPDATE SET is_available = excluded.is_available
    `);

    insert.run(doctor_id, available_date, start_time, end_time, is_available !== undefined ? (is_available ? 1 : 0) : 1);
    return res.status(201).json({ message: 'Availability updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/availability/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM doctor_availability WHERE availability_id = ?').run(req.params.id);
    return res.json({ message: 'Availability slot removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Admin Dashboard & Reports Endpoints
app.get('/api/admin/dashboard', (req: Request, res: Response) => {
  try {
    const patientCount = (db.prepare('SELECT COUNT(*) as count FROM patients WHERE is_active = 1').get() as any).count;
    const doctorCount = (db.prepare('SELECT COUNT(*) as count FROM doctors WHERE is_active = 1').get() as any).count;
    const totalAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments').get() as any).count;
    const pendingAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Scheduled'").get() as any).count;
    const completedAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Completed'").get() as any).count;
    const cancelledAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Cancelled'").get() as any).count;

    // Revenue calculation based on completed appointments
    const revenueRow = db.prepare(`
      SELECT SUM(d.consultation_fee) as total_revenue
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.status = 'Completed'
    `).get() as any;

    return res.json({
      total_patients: patientCount,
      total_doctors: doctorCount,
      total_appointments: totalAppointments,
      pending_appointments: pendingAppointments,
      completed_appointments: completedAppointments,
      cancelled_appointments: cancelledAppointments,
      total_revenue: revenueRow?.total_revenue || 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/reports', (req: Request, res: Response) => {
  try {
    // Specialization distribution
    const specializations = db.prepare(`
      SELECT specialization, COUNT(*) as doctor_count
      FROM doctors
      GROUP BY specialization
    `).all();

    // Appointments by status
    const statusSummary = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM appointments
      GROUP BY status
    `).all();

    // Doctor performance report
    const doctorStats = db.prepare(`
      SELECT d.doctor_id, d.name, d.specialization,
             COUNT(a.appointment_id) as total_consultations,
             SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed_consultations,
             SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_consultations
      FROM doctors d
      LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
      GROUP BY d.doctor_id
      ORDER BY total_consultations DESC
    `).all();

    return res.json({
      specializations,
      status_summary: statusSummary,
      doctor_stats: doctorStats
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Toggle patient/doctor status
app.put('/api/admin/users/:role/:id/status', (req: Request, res: Response) => {
  try {
    const { role, id } = req.params;
    const { is_active } = req.body;
    const activeVal = is_active ? 1 : 0;

    if (role === 'patient') {
      db.prepare('UPDATE patients SET is_active = ? WHERE patient_id = ?').run(activeVal, id);
      return res.json({ message: `Patient account ${activeVal ? 'activated' : 'deactivated'} successfully.` });
    } else if (role === 'doctor') {
      db.prepare('UPDATE doctors SET is_active = ?, availability_status = ? WHERE doctor_id = ?')
        .run(activeVal, activeVal ? 'Available' : 'Unavailable', id);
      return res.json({ message: `Doctor account ${activeVal ? 'activated' : 'deactivated'} successfully.` });
    }

    return res.status(400).json({ error: 'Invalid user role' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// Vite Middleware / Static Serving
// ----------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediConnect server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
