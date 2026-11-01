/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Shield,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronRight,
  LogOut,
  Hospital,
  ArrowRight,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';

interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  phone_number?: string;
  gender?: string;
  date_of_birth?: string;
  specialization?: string;
  consultation_fee?: number;
  avatar_url?: string;
}

interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  phone_number: string;
  email: string;
  availability_status: string;
  bio?: string;
  consultation_fee: number;
  experience_years: number;
  avatar_url?: string;
  is_active: number | boolean;
  total_appointments?: number;
}

interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  notes?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  doctor_fee?: number;
  doctor_avatar?: string;
}

interface MedicalRecord {
  record_id: number;
  patient_id: number;
  doctor_id?: number;
  diagnosis: string;
  symptoms: string;
  treatment?: string;
  record_date: string;
  doctor_name?: string;
  doctor_specialization?: string;
}

interface Prescription {
  prescription_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_id?: number;
  medicines: string;
  dosage: string;
  instructions: string;
  prescription_date: string;
  doctor_name?: string;
  doctor_specialization?: string;
}

interface Slot {
  availability_id: number;
  doctor_id: number;
  available_date: string;
  start_time: string;
  end_time: string;
  is_available: number | boolean;
  is_booked?: boolean;
}

interface AdminStats {
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_revenue: number;
}

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('mediconnect_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Active View / Tab
  const [activeTab, setActiveTab] = useState<'home' | 'portal' | 'browse' | 'login' | 'register'>('home');
  const [adminSection, setAdminSection] = useState<'overview' | 'doctors' | 'patients' | 'appointments' | 'reports'>('overview');

  // Core Data States
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminReports, setAdminReports] = useState<any>(null);
  const [allPatients, setAllPatients] = useState<any[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [appointmentFilterStatus, setAppointmentFilterStatus] = useState('All');

  // Modal States
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlots, setBookingSlots] = useState<Slot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Doctor Action Modals
  const [prescriptionAppt, setPrescriptionAppt] = useState<Appointment | null>(null);
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxMedicines, setRxMedicines] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');

  // Doctor Add Slot State
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('09:30');

  // Patient Add Record Modal
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newTreatment, setNewTreatment] = useState('');

  // Admin Add Doctor Modal
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('Cardiology');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('Doctor@123');
  const [newDocFee, setNewDocFee] = useState(90);
  const [newDocExp, setNewDocExp] = useState(8);
  const [newDocBio, setNewDocBio] = useState('');

  // Patient History Inspector Modal for Doctors
  const [historyPatient, setHistoryPatient] = useState<{ id: number; name: string } | null>(null);
  const [patientHistoryList, setPatientHistoryList] = useState<MedicalRecord[]>([]);

  // UI Toast Alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Login & Register Form Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regDob, setRegDob] = useState('1994-06-15');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Helper API client wrapper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (currentUser) {
      headers['x-user-role'] = currentUser.role;
      headers['x-user-id'] = String(currentUser.id);
    }

    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || `HTTP error ${res.status}`);
    }
    return data;
  };

  // Load initial public and session data
  const loadPlatformData = async () => {
    try {
      const docs = await apiCall('/api/doctors');
      setDoctors(docs);

      if (currentUser) {
        if (currentUser.role === 'patient') {
          const appts = await apiCall(`/api/appointments?patient_id=${currentUser.id}`);
          setAppointments(appts);
          const records = await apiCall(`/api/medical-records/${currentUser.id}`);
          setMedicalRecords(records);
          const rxs = await apiCall(`/api/prescriptions/${currentUser.id}`);
          setPrescriptions(rxs);
        } else if (currentUser.role === 'doctor') {
          const appts = await apiCall(`/api/appointments?doctor_id=${currentUser.id}`);
          setAppointments(appts);
          const slots = await apiCall(`/api/availability/${currentUser.id}`);
          setBookingSlots(slots);
        } else if (currentUser.role === 'admin') {
          const stats = await apiCall('/api/admin/dashboard');
          setAdminStats(stats);
          const reports = await apiCall('/api/admin/reports');
          setAdminReports(reports);
          const pts = await apiCall('/api/patients');
          setAllPatients(pts);
          const appts = await apiCall('/api/appointments');
          setAppointments(appts);
        }
      }
    } catch (err: any) {
      console.error('Data sync error:', err);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, [currentUser]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          role: loginRole || undefined
        })
      });

      setCurrentUser(res.user);
      localStorage.setItem('mediconnect_current_user', JSON.stringify(res.user));
      showToast(`Welcome back, ${res.user.name}!`);
      setActiveTab('portal');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Quick Demo Login
  const handleQuickDemo = async (role: 'patient' | 'doctor' | 'admin') => {
    let email = 'john.doe@example.com';
    let password = 'Patient@123';
    if (role === 'doctor') {
      email = 'dr.sarah@mediconnect.com';
      password = 'Doctor@123';
    } else if (role === 'admin') {
      email = 'admin@mediconnect.com';
      password = 'Admin@123';
    }

    try {
      const res = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
      });

      setCurrentUser(res.user);
      localStorage.setItem('mediconnect_current_user', JSON.stringify(res.user));
      showToast(`Logged in as ${res.user.name} (${role.toUpperCase()})`);
      setActiveTab('portal');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    try {
      const res = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone_number: regPhone,
          gender: regGender,
          date_of_birth: regDob,
          password: regPassword
        })
      });

      setCurrentUser(res.user);
      localStorage.setItem('mediconnect_current_user', JSON.stringify(res.user));
      showToast('Registration successful! Welcome to MediConnect.');
      setActiveTab('portal');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mediconnect_current_user');
    setActiveTab('home');
    showToast('Signed out successfully.');
  };

  // Open Appointment Booking Modal
  const openBooking = async (doctor: Doctor) => {
    if (!currentUser) {
      setActiveTab('login');
      showToast('Please sign in or register to book an appointment.', 'error');
      return;
    }
    if (currentUser.role !== 'patient') {
      showToast('Only patient accounts can schedule doctor consultations.', 'error');
      return;
    }

    setBookingDoctor(doctor);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setBookingDate(tomorrow);
    setSelectedSlotTime('');
    setBookingReason('');
    setBookingNotes('');

    // Fetch availability for tomorrow
    try {
      const slots = await apiCall(`/api/availability/${doctor.doctor_id}?date=${tomorrow}`);
      setBookingSlots(slots);
    } catch (err) {
      console.error(err);
    }
  };

  // Date changed in booking modal
  const handleDateChange = async (date: string) => {
    setBookingDate(date);
    setSelectedSlotTime('');
    if (bookingDoctor) {
      try {
        const slots = await apiCall(`/api/availability/${bookingDoctor.doctor_id}?date=${date}`);
        setBookingSlots(slots);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Submit Appointment Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctor || !selectedSlotTime || !bookingDate || !bookingReason.trim()) {
      showToast('Please pick a date, available time slot, and reason.', 'error');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const res = await apiCall('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: currentUser!.id,
          doctor_id: bookingDoctor.doctor_id,
          appointment_date: bookingDate,
          appointment_time: selectedSlotTime,
          reason: bookingReason,
          notes: bookingNotes
        })
      });

      showToast(`Appointment confirmed with ${bookingDoctor.name}!`);
      setBookingDoctor(null);
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await apiCall(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
      showToast('Appointment cancelled successfully.');
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Doctor: Save Prescription & Complete Consultation
  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionAppt) return;

    try {
      await apiCall('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: prescriptionAppt.patient_id,
          doctor_id: currentUser!.id,
          appointment_id: prescriptionAppt.appointment_id,
          medicines: rxMedicines,
          dosage: rxDosage,
          instructions: rxInstructions
        })
      });

      if (rxDiagnosis.trim()) {
        await apiCall('/api/medical-records', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: prescriptionAppt.patient_id,
            doctor_id: currentUser!.id,
            diagnosis: rxDiagnosis,
            symptoms: prescriptionAppt.reason,
            treatment: `Rx: ${rxMedicines}. Instructions: ${rxInstructions}`
          })
        });
      }

      showToast('Consultation marked completed and prescription issued!');
      setPrescriptionAppt(null);
      setRxDiagnosis('');
      setRxMedicines('');
      setRxDosage('');
      setRxInstructions('');
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Doctor: Add Availability Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotDate) {
      showToast('Please select a date for the slot.', 'error');
      return;
    }

    try {
      await apiCall('/api/availability', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: currentUser!.id,
          available_date: newSlotDate,
          start_time: newSlotStart,
          end_time: newSlotEnd,
          is_available: true
        })
      });

      showToast('Availability slot added.');
      const slots = await apiCall(`/api/availability/${currentUser!.id}`);
      setBookingSlots(slots);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Doctor: Remove Availability Slot
  const handleRemoveSlot = async (slotId: number) => {
    try {
      await apiCall(`/api/availability/${slotId}`, { method: 'DELETE' });
      showToast('Slot removed.');
      const slots = await apiCall(`/api/availability/${currentUser!.id}`);
      setBookingSlots(slots);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Patient: Add Medical Record
  const handleAddMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: currentUser!.id,
          diagnosis: newDiagnosis,
          symptoms: newSymptoms,
          treatment: newTreatment
        })
      });

      showToast('Medical record saved.');
      setShowAddRecordModal(false);
      setNewDiagnosis('');
      setNewSymptoms('');
      setNewTreatment('');
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin: Register Doctor
  const handleAdminAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: newDocName,
          specialization: newDocSpec,
          email: newDocEmail,
          phone_number: newDocPhone,
          password: newDocPassword,
          consultation_fee: Number(newDocFee),
          experience_years: Number(newDocExp),
          bio: newDocBio
        })
      });

      showToast(`Doctor ${newDocName} registered successfully!`);
      setShowAddDoctorModal(false);
      setNewDocName('');
      setNewDocEmail('');
      setNewDocPhone('');
      setNewDocBio('');
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin: Toggle Doctor Status
  const handleToggleDoctorStatus = async (doctorId: number, active: boolean) => {
    try {
      await apiCall(`/api/admin/users/doctor/${doctorId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: active })
      });
      showToast(`Doctor status updated to ${active ? 'Active' : 'Deactivated'}.`);
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin: Toggle Patient Status
  const handleTogglePatientStatus = async (patientId: number, active: boolean) => {
    try {
      await apiCall(`/api/admin/users/patient/${patientId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: active })
      });
      showToast(`Patient account ${active ? 'activated' : 'suspended'}.`);
      loadPlatformData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered Doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = selectedSpecialty === 'All' || doc.specialization === selectedSpecialty;
    return matchesSearch && matchesSpec;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-900/20'
              : 'bg-emerald-700 text-white shadow-emerald-900/20'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Demo Role Switcher Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-400">Live Demonstration Mode:</span>
            <span className="text-slate-400 hidden sm:inline">1-Click switch active account role</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickDemo('patient')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium transition-colors"
            >
              Demo Patient (John Doe)
            </button>
            <button
              onClick={() => handleQuickDemo('doctor')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition-colors"
            >
              Demo Doctor (Dr. Sarah)
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition-colors"
            >
              Demo Admin (Console)
            </button>
          </div>
        </div>
      </div>

      {/* Top Bar Contract Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:opacity-90"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span>MediConnect</span>
          </button>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'home' ? 'text-sky-600 font-semibold' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'browse' ? 'text-sky-600 font-semibold' : ''}`}
            >
              Find Specialists
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab('portal')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'portal' ? 'text-sky-600 font-semibold' : ''}`}
              >
                {currentUser.role === 'patient' && 'Patient Dashboard'}
                {currentUser.role === 'doctor' && 'Doctor Workspace'}
                {currentUser.role === 'admin' && 'Admin Console'}
              </button>
            )}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-sky-600 capitalize">{currentUser.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  Register Patient
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ============================================================== */}
        {/* VIEW 1: HOME PAGE */}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-sky-50/60 to-slate-50 border-b border-slate-200 py-16 px-6">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                    Trusted Telehealth Consultations
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    Expert Medical Consultations, Prescriptions & Records Online
                  </h1>
                  <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                    Connect with licensed cardiologists, neurologists, and pediatricians. Schedule verified video
                    consultations, access diagnostic history, and receive official prescriptions in one integrated platform.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (currentUser && currentUser.role === 'patient') {
                          setActiveTab('portal');
                        } else {
                          setActiveTab('browse');
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-colors flex items-center gap-2"
                    >
                      <span>Find a Specialist</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {!currentUser && (
                      <button
                        onClick={() => setActiveTab('register')}
                        className="px-6 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold text-sm transition-colors"
                      >
                        Create Patient Account
                      </button>
                    )}
                  </div>

                  {/* Quantitative proof metrics */}
                  <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-6 text-slate-700">
                    <div>
                      <div className="text-2xl font-bold text-slate-900 tabular-nums">100%</div>
                      <div className="text-xs text-slate-500 mt-0.5">Verified MD Specialists</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 tabular-nums">0 min</div>
                      <div className="text-xs text-slate-500 mt-0.5">Physical Waiting Time</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 tabular-nums">Instant</div>
                      <div className="text-xs text-slate-500 mt-0.5">Digital Prescriptions</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/70 bg-white">
                    <img
                      src="/src/assets/images/hero_telehealth_consultation_1793515595409.jpg"
                      alt="Telemedicine Consultation"
                      className="w-full h-80 sm:h-96 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Dr. Sarah Jenkins, MD</div>
                        <div className="text-xs text-slate-500">Board-Certified Cardiologist · 12 yrs exp</div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                        Accepting Patients
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Doctors Showcase */}
            <section className="max-w-7xl mx-auto py-16 px-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Featured Medical Specialists</h2>
                  <p className="text-sm text-slate-500 mt-1">Book a consultation with certified doctors today</p>
                </div>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <span>View All Doctors</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {doctors.slice(0, 3).map((doc) => (
                  <div
                    key={doc.doctor_id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <img
                          src={doc.avatar_url || '/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg'}
                          alt={doc.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-sky-100"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                          <div className="text-xs font-medium text-sky-600">{doc.specialization}</div>
                          <div className="text-xs text-slate-500 mt-1">{doc.experience_years} years clinical experience</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">{doc.bio}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500">Consultation Fee</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">${doc.consultation_fee}</div>
                      </div>
                      <button
                        onClick={() => openBooking(doc)}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: BROWSE DOCTORS & BOOKING */}
        {/* ============================================================== */}
        {activeTab === 'browse' && (
          <div className="max-w-7xl mx-auto py-10 px-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Find & Consult Specialists</h1>
              <p className="text-sm text-slate-500 mt-1">
                Filter by clinical department, search by physician name, and book available time slots
              </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search doctor name or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Department:</span>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="text-xs font-medium py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                >
                  <option value="All">All Specialties</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.doctor_id}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={doc.avatar_url || '/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg'}
                        alt={doc.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-sky-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {doc.availability_status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-sky-600 mt-0.5">{doc.specialization}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>{doc.experience_years}y exp</span>
                          <span>·</span>
                          <span className="tabular-nums">{doc.total_appointments || 0} visits</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">{doc.bio}</p>

                    <div className="space-y-1 text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500">Fee per session</div>
                      <div className="text-base font-bold text-slate-900 tabular-nums">${doc.consultation_fee}</div>
                    </div>
                    <button
                      onClick={() => openBooking(doc)}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Book Consultation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: USER PORTAL (PATIENT / DOCTOR / ADMIN DASHBOARDS) */}
        {/* ============================================================== */}
        {activeTab === 'portal' && currentUser && (
          <div className="max-w-7xl mx-auto py-10 px-6 space-y-8">
            {/* Header Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-sky-600">
                  {currentUser.role === 'patient' && 'Patient Healthcare Center'}
                  {currentUser.role === 'doctor' && 'Physician Clinical Portal'}
                  {currentUser.role === 'admin' && 'Central Management Console'}
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">Welcome back, {currentUser.name}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser.email} · {currentUser.role.toUpperCase()}
                  {currentUser.specialization && ` · ${currentUser.specialization}`}
                </p>
              </div>

              {currentUser.role === 'patient' && (
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book New Appointment</span>
                </button>
              )}
            </div>

            {/* ----------------- PATIENT PORTAL CONTENT ----------------- */}
            {currentUser.role === 'patient' && (
              <div className="space-y-8">
                {/* Patient KPI Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Upcoming Appointments</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {appointments.filter((a) => a.status === 'Scheduled').length}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Completed Consults</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {appointments.filter((a) => a.status === 'Completed').length}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Medical Records</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{medicalRecords.length}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Active Prescriptions</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{prescriptions.length}</div>
                  </div>
                </div>

                {/* Patient Appointments Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">My Scheduled & Past Appointments</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Track your telemedicine appointments and doctor status</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Doctor</th>
                          <th className="py-3 px-4">Consultation Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {appointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No appointments found. Click "Book New Appointment" to schedule one.
                            </td>
                          </tr>
                        ) : (
                          appointments.map((a) => (
                            <tr key={a.appointment_id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-4 font-medium text-slate-900">
                                <div>{a.appointment_date}</div>
                                <div className="text-[11px] text-slate-500 tabular-nums">{a.appointment_time}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900">{a.doctor_name || 'Dr. Assigned'}</div>
                                <div className="text-[11px] text-slate-500">{a.doctor_specialization}</div>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">{a.reason}</td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    a.status === 'Scheduled'
                                      ? 'bg-sky-100 text-sky-800'
                                      : a.status === 'Completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {a.status === 'Scheduled' ? (
                                  <button
                                    onClick={() => handleCancelAppointment(a.appointment_id)}
                                    className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Archived</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2-Column Split: Medical Records and Prescriptions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Medical Records */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">Electronic Medical History</h2>
                        <p className="text-xs text-slate-500">Diagnoses, reported symptoms and history</p>
                      </div>
                      <button
                        onClick={() => setShowAddRecordModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Entry</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {medicalRecords.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">No medical records recorded yet.</div>
                      ) : (
                        medicalRecords.map((r) => (
                          <div key={r.record_id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-900">{r.diagnosis}</span>
                              <span className="text-[11px] text-slate-400 tabular-nums">{r.record_date}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              <span className="font-medium text-slate-700">Symptoms:</span> {r.symptoms}
                            </div>
                            {r.treatment && (
                              <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">Treatment:</span> {r.treatment}
                              </div>
                            )}
                            <div className="text-[11px] text-sky-600 pt-1">Physician: {r.doctor_name || 'Self Reported'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Prescriptions */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h2 className="font-bold text-slate-900 text-base">Digital Prescriptions</h2>
                      <p className="text-xs text-slate-500">Official medication orders issued by your doctor</p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {prescriptions.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">No digital prescriptions issued yet.</div>
                      ) : (
                        prescriptions.map((p) => (
                          <div key={p.prescription_id} className="p-4 rounded-lg bg-sky-50/50 border border-sky-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-sky-600" />
                                <span className="font-bold text-xs text-slate-900">{p.medicines}</span>
                              </div>
                              <span className="text-[11px] text-slate-400 tabular-nums">{p.prescription_date}</span>
                            </div>
                            <div className="text-xs text-slate-700">
                              <strong>Dosage:</strong> {p.dosage}
                            </div>
                            <div className="text-xs text-slate-600">
                              <strong>Instructions:</strong> {p.instructions}
                            </div>
                            <div className="text-[11px] text-slate-500 pt-1 border-t border-sky-100/60 mt-1">
                              Prescribed by: {p.doctor_name} ({p.doctor_specialization})
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- DOCTOR PORTAL CONTENT ----------------- */}
            {currentUser.role === 'doctor' && (
              <div className="space-y-8">
                {/* Doctor KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Scheduled Appointments</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {appointments.filter((a) => a.status === 'Scheduled').length}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Completed Consults</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {appointments.filter((a) => a.status === 'Completed').length}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Consultation Fee</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      ${currentUser.consultation_fee || 120}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">Unique Patients</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {new Set(appointments.map((a) => a.patient_id)).size}
                    </div>
                  </div>
                </div>

                {/* Manage Availability Slots */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Doctor Availability & Slot Management</h2>
                    <p className="text-xs text-slate-500">Add or remove patient consultation time slots</p>
                  </div>

                  {/* Add Slot Form */}
                  <form onSubmit={handleAddSlot} className="flex flex-wrap items-end gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={newSlotDate}
                        onChange={(e) => setNewSlotDate(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        required
                        value={newSlotStart}
                        onChange={(e) => setNewSlotStart(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">End Time</label>
                      <input
                        type="time"
                        required
                        value={newSlotEnd}
                        onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      + Add Availability Slot
                    </button>
                  </form>

                  {/* Current Active Slots */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">Configured Slots:</div>
                    <div className="flex flex-wrap gap-2">
                      {bookingSlots.length === 0 ? (
                        <div className="text-xs text-slate-400">No slots defined yet. Use the form above to add slots.</div>
                      ) : (
                        bookingSlots.map((s) => (
                          <div
                            key={s.availability_id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium"
                          >
                            <span>
                              {s.available_date}: {s.start_time} - {s.end_time}
                            </span>
                            <button
                              onClick={() => handleRemoveSlot(s.availability_id)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Doctor Assigned Appointments Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-200">
                    <h2 className="font-bold text-slate-900 text-base">Assigned Patient Consultations</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Diagnose patients, issue prescriptions, and update status</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Reason / Symptoms</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {appointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No consultations assigned to your schedule.
                            </td>
                          </tr>
                        ) : (
                          appointments.map((a) => (
                            <tr key={a.appointment_id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-4 font-medium text-slate-900">
                                <div>{a.appointment_date}</div>
                                <div className="text-[11px] text-slate-500 tabular-nums">{a.appointment_time}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900">{a.patient_name}</div>
                                <div className="text-[11px] text-slate-500">{a.patient_phone || a.patient_email}</div>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs text-slate-600">{a.reason}</td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    a.status === 'Scheduled'
                                      ? 'bg-sky-100 text-sky-800'
                                      : a.status === 'Completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {a.status === 'Scheduled' ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setPrescriptionAppt(a);
                                          setRxDiagnosis('');
                                          setRxMedicines('');
                                          setRxDosage('');
                                          setRxInstructions('');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors"
                                      >
                                        Prescribe & Complete
                                      </button>
                                      <button
                                        onClick={() => handleCancelAppointment(a.appointment_id)}
                                        className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        setHistoryPatient({ id: a.patient_id, name: a.patient_name || 'Patient' });
                                        try {
                                          const recs = await apiCall(`/api/medical-records/${a.patient_id}`);
                                          setPatientHistoryList(recs);
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                    >
                                      View History
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- ADMIN PORTAL CONTENT ----------------- */}
            {currentUser.role === 'admin' && (
              <div className="space-y-8">
                {/* Admin Subnav */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setAdminSection('overview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      adminSection === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Platform Overview
                  </button>
                  <button
                    onClick={() => setAdminSection('doctors')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      adminSection === 'doctors' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Doctors Management
                  </button>
                  <button
                    onClick={() => setAdminSection('patients')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      adminSection === 'patients' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Patients
                  </button>
                  <button
                    onClick={() => setAdminSection('appointments')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      adminSection === 'appointments' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Appointments Audit
                  </button>
                  <button
                    onClick={() => setAdminSection('reports')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      adminSection === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Reports & Analytics
                  </button>
                </div>

                {/* Section: Overview */}
                {adminSection === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Total Patients</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                          {adminStats?.total_patients || allPatients.length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Total Doctors</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                          {adminStats?.total_doctors || doctors.length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">All Appointments</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                          {adminStats?.total_appointments || appointments.length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Pending Scheduled</div>
                        <div className="text-2xl font-bold text-sky-700 mt-1 tabular-nums">
                          {adminStats?.pending_appointments || appointments.filter((a) => a.status === 'Scheduled').length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Completed</div>
                        <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                          {adminStats?.completed_appointments || appointments.filter((a) => a.status === 'Completed').length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Consultation Revenue</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                          ${adminStats?.total_revenue?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-2">Recent Platform Consultations</h3>
                      <div className="space-y-2">
                        {appointments.slice(0, 5).map((a) => (
                          <div key={a.appointment_id} className="flex items-center justify-between p-3 rounded bg-slate-50 text-xs">
                            <div>
                              <strong className="text-slate-900">{a.patient_name}</strong> booked with{' '}
                              <strong className="text-sky-700">{a.doctor_name}</strong> ({a.doctor_specialization})
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums text-slate-500">{a.appointment_date} {a.appointment_time}</span>
                              <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-200 text-slate-800">
                                {a.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section: Doctors Management */}
                {adminSection === 'doctors' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">Physicians & Specialists Directory</h2>
                        <p className="text-xs text-slate-500">Register new doctors and modify account status</p>
                      </div>
                      <button
                        onClick={() => setShowAddDoctorModal(true)}
                        className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register Doctor</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                            <th className="p-3">Doctor</th>
                            <th className="p-3">Department</th>
                            <th className="p-3">Contact</th>
                            <th className="p-3">Fee</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {doctors.map((d) => (
                            <tr key={d.doctor_id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-semibold text-slate-900">{d.name}</td>
                              <td className="p-3 text-sky-700">{d.specialization}</td>
                              <td className="p-3 text-slate-500">{d.email} · {d.phone_number}</td>
                              <td className="p-3 tabular-nums font-medium">${d.consultation_fee}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    d.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {d.is_active ? 'Active' : 'Deactivated'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleToggleDoctorStatus(d.doctor_id, !d.is_active)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                                    d.is_active
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {d.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Patients */}
                {adminSection === 'patients' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Registered Patients</h2>
                      <p className="text-xs text-slate-500">Review patient accounts and account status</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email & Phone</th>
                            <th className="p-3">Gender / DOB</th>
                            <th className="p-3">Bookings</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allPatients.map((p) => (
                            <tr key={p.patient_id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                              <td className="p-3 text-slate-500">{p.email} · {p.phone_number}</td>
                              <td className="p-3 text-slate-500">{p.gender} · {p.date_of_birth}</td>
                              <td className="p-3 tabular-nums font-medium">{p.appointment_count || 0}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {p.is_active ? 'Active' : 'Suspended'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleTogglePatientStatus(p.patient_id, !p.is_active)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                                    p.is_active
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {p.is_active ? 'Suspend' : 'Reactivate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Appointments Audit */}
                {adminSection === 'appointments' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">Central Appointment Audit Log</h2>
                        <p className="text-xs text-slate-500">Every appointment across all physicians and patients</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Filter Status:</span>
                        <select
                          value={appointmentFilterStatus}
                          onChange={(e) => setAppointmentFilterStatus(e.target.value)}
                          className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 focus:outline-none"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                            <th className="p-3">ID</th>
                            <th className="p-3">Schedule</th>
                            <th className="p-3">Patient</th>
                            <th className="p-3">Doctor</th>
                            <th className="p-3">Reason</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {appointments
                            .filter((a) => appointmentFilterStatus === 'All' || a.status === appointmentFilterStatus)
                            .map((a) => (
                              <tr key={a.appointment_id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-slate-500">#{a.appointment_id}</td>
                                <td className="p-3 tabular-nums font-medium">
                                  {a.appointment_date} {a.appointment_time}
                                </td>
                                <td className="p-3 font-semibold text-slate-900">{a.patient_name}</td>
                                <td className="p-3 text-slate-700">
                                  {a.doctor_name} ({a.doctor_specialization})
                                </td>
                                <td className="p-3 max-w-xs truncate text-slate-600">{a.reason}</td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      a.status === 'Scheduled'
                                        ? 'bg-sky-100 text-sky-800'
                                        : a.status === 'Completed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {a.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {a.status === 'Scheduled' ? (
                                    <button
                                      onClick={() => handleCancelAppointment(a.appointment_id)}
                                      className="px-2 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded"
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Reports */}
                {adminSection === 'reports' && adminReports && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="font-bold text-slate-900 text-base">Specialization Distribution</h3>
                      <div className="divide-y divide-slate-100">
                        {adminReports.specializations?.map((s: any) => (
                          <div key={s.specialization} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{s.specialization}</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{s.doctor_count} doctors</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="font-bold text-slate-900 text-base">Doctor Performance Statistics</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                              <th className="p-2">Doctor</th>
                              <th className="p-2">Specialty</th>
                              <th className="p-2 text-center">Total</th>
                              <th className="p-2 text-center">Done</th>
                              <th className="p-2 text-center">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {adminReports.doctor_stats?.map((d: any) => (
                              <tr key={d.doctor_id}>
                                <td className="p-2 font-semibold text-slate-900">{d.name}</td>
                                <td className="p-2 text-slate-500">{d.specialization}</td>
                                <td className="p-2 text-center font-bold tabular-nums">{d.total_consultations}</td>
                                <td className="p-2 text-center text-emerald-700 font-bold tabular-nums">
                                  {d.completed_consultations}
                                </td>
                                <td className="p-2 text-center text-rose-700 font-bold tabular-nums">
                                  {d.cancelled_consultations}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: LOGIN PAGE */}
        {/* ============================================================== */}
        {activeTab === 'login' && (
          <div className="max-w-md mx-auto py-16 px-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Sign In to MediConnect</h1>
                <p className="text-xs text-slate-500">Access patient consultations, doctor schedules, or admin portal</p>
              </div>

              {/* Quick Demo Fill Buttons */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700">Quick Fill Demo Credentials:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('john.doe@example.com');
                      setLoginPassword('Patient@123');
                      setLoginRole('patient');
                    }}
                    className="px-2 py-1.5 rounded bg-white border border-slate-200 hover:border-sky-500 text-[11px] font-medium text-slate-700"
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('dr.sarah@mediconnect.com');
                      setLoginPassword('Doctor@123');
                      setLoginRole('doctor');
                    }}
                    className="px-2 py-1.5 rounded bg-white border border-slate-200 hover:border-sky-500 text-[11px] font-medium text-slate-700"
                  >
                    Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@mediconnect.com');
                      setLoginPassword('Admin@123');
                      setLoginRole('admin');
                    }}
                    className="px-2 py-1.5 rounded bg-white border border-slate-200 hover:border-sky-500 text-[11px] font-medium text-slate-700"
                  >
                    Admin
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role (Optional Auto-Detect)</label>
                  <select
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                  >
                    <option value="">Auto-Detect Role</option>
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors mt-2"
                >
                  Sign In
                </button>
              </form>

              <div className="text-center text-xs text-slate-500">
                New to the platform?{' '}
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-sky-600 font-semibold hover:underline"
                >
                  Create Patient Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: REGISTER PAGE */}
        {/* ============================================================== */}
        {activeTab === 'register' && (
          <div className="max-w-lg mx-auto py-14 px-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Patient Registration</h1>
                <p className="text-xs text-slate-500">Create your secure account to consult doctors online</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors mt-2"
                >
                  Create Patient Account
                </button>
              </form>

              <div className="text-center text-xs text-slate-500">
                Already registered?{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-sky-600 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: BOOK APPOINTMENT WITH REAL-TIME SLOT SELECTION & CONFLICT GUARD */}
      {/* ============================================================== */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Book Consultation</h3>
                <div className="text-xs text-sky-700 font-semibold">{bookingDoctor.name} · {bookingDoctor.specialization}</div>
                <div className="text-xs text-slate-500 mt-0.5">Consultation Fee: ${bookingDoctor.consultation_fee}</div>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Available Doctor Time Slots (Prevent Double-Booking)
                </label>
                {bookingSlots.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    No active slots available for this doctor on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {bookingSlots.map((slot) => {
                      const booked = slot.is_booked;
                      const isSelected = selectedSlotTime === slot.start_time;
                      return (
                        <button
                          key={slot.availability_id}
                          type="button"
                          disabled={booked}
                          onClick={() => setSelectedSlotTime(slot.start_time)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                            booked
                              ? 'bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-500'
                          }`}
                        >
                          {slot.start_time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Consultation</label>
                <input
                  type="text"
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder="e.g. Occasional chest tightness, palpitations"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Clinical Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Any previous medication or symptoms duration"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingDoctor(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking || !selectedSlotTime}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingBooking ? 'Reserving...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DOCTOR PRESCRIBE & COMPLETE CONSULTATION */}
      {/* ============================================================== */}
      {prescriptionAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Issue Prescription & Complete Visit</h3>
                <div className="text-xs text-sky-700 font-semibold">
                  Patient: {prescriptionAppt.patient_name} · Reason: {prescriptionAppt.reason}
                </div>
              </div>
              <button
                onClick={() => setPrescriptionAppt(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Diagnosis</label>
                <input
                  type="text"
                  required
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  placeholder="e.g. Mild Essential Hypertension"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prescribed Medicines</label>
                <input
                  type="text"
                  required
                  value={rxMedicines}
                  onChange={(e) => setRxMedicines(e.target.value)}
                  placeholder="e.g. Amlodipine 5mg, Omega-3 Fish Oil 1000mg"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage & Frequency</label>
                <input
                  type="text"
                  required
                  value={rxDosage}
                  onChange={(e) => setRxDosage(e.target.value)}
                  placeholder="e.g. 1 tablet daily every morning after breakfast"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dietary & Lifestyle Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="Reduce salt intake, maintain hydration, review BP in 14 days"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrescriptionAppt(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Save & Complete Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PATIENT LOG MEDICAL RECORD */}
      {/* ============================================================== */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Medical History Record</h3>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMedicalRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis / Health Condition</label>
                <input
                  type="text"
                  required
                  value={newDiagnosis}
                  onChange={(e) => setNewDiagnosis(e.target.value)}
                  placeholder="e.g. Asthma, Pollen Allergy"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Symptoms Experienced</label>
                <textarea
                  rows={2}
                  required
                  value={newSymptoms}
                  onChange={(e) => setNewSymptoms(e.target.value)}
                  placeholder="Describe your symptoms"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Treatment / Notes (Optional)</label>
                <input
                  type="text"
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  placeholder="e.g. Inhaler, low sodium diet"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADMIN REGISTER NEW DOCTOR */}
      {/* ============================================================== */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Register New Doctor</h3>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdminAddDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Dr. Michael Chang"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                  <select
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee ($)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={newDocFee}
                    onChange={(e) => setNewDocFee(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newDocEmail}
                    onChange={(e) => setNewDocEmail(e.target.value)}
                    placeholder="doctor@mediconnect.com"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newDocPassword}
                    onChange={(e) => setNewDocPassword(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newDocExp}
                    onChange={(e) => setNewDocExp(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Bio</label>
                <textarea
                  rows={2}
                  value={newDocBio}
                  onChange={(e) => setNewDocBio(e.target.value)}
                  placeholder="Specialist credentials and clinical expertise"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PATIENT CLINICAL HISTORY (DOCTOR VIEW) */}
      {/* ============================================================== */}
      {historyPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Patient Medical History</h3>
                <div className="text-xs text-sky-700 font-semibold">{historyPatient.name}</div>
              </div>
              <button
                onClick={() => setHistoryPatient(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {patientHistoryList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No recorded prior clinical records for this patient.
                </div>
              ) : (
                patientHistoryList.map((r) => (
                  <div key={r.record_id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{r.diagnosis}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">{r.record_date}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <strong>Symptoms:</strong> {r.symptoms}
                    </div>
                    {r.treatment && (
                      <div className="text-xs text-slate-500">
                        <strong>Treatment:</strong> {r.treatment}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setHistoryPatient(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-sky-500" />
            <span className="font-bold text-white">MediConnect</span>
            <span>· Online Doctor Consultation & Records Platform</span>
          </div>
          <div>&copy; 2026 MediConnect Healthcare Systems. All clinical operations secured.</div>
        </div>
      </footer>
    </div>
  );
}
