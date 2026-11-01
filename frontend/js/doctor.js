/**
 * Doctor Module Functionality:
 * View schedule, complete appointments, write prescriptions, manage availability slots
 */
let doctorAppointments = [];
let activeAppointmentForRx = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = App.getUser();
  if (!user || user.role !== 'doctor') {
    window.location.href = 'login.html';
    return;
  }

  const nameEl = document.getElementById('doctor-name-display');
  const specEl = document.getElementById('doctor-spec-display');
  if (nameEl) nameEl.innerText = user.name;
  if (specEl) specEl.innerText = user.specialization || 'Medical Specialist';

  loadDoctorDashboard();
});

async function loadDoctorDashboard() {
  const user = App.getUser();
  try {
    const appointments = await App.request(`/api/appointments?doctor_id=${user.id}`);
    doctorAppointments = appointments;
    renderDoctorAppointments(appointments);

    // Filter today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.appointment_date === today);
    const completedAppts = appointments.filter(a => a.status === 'Completed');
    const scheduledAppts = appointments.filter(a => a.status === 'Scheduled');

    // Unique patients
    const patientIds = new Set(appointments.map(a => a.patient_id));

    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = todayAppts.length;
    if (document.getElementById('stat-completed')) document.getElementById('stat-completed').innerText = completedAppts.length;
    if (document.getElementById('stat-scheduled')) document.getElementById('stat-scheduled').innerText = scheduledAppts.length;
    if (document.getElementById('stat-patients')) document.getElementById('stat-patients').innerText = patientIds.size;

    loadDoctorAvailability();
  } catch (err) {
    App.showAlert('Error loading doctor dashboard: ' + err.message, 'error');
  }
}

function renderDoctorAppointments(appointments) {
  const tbody = document.getElementById('doctor-appointments-body');
  if (!tbody) return;

  if (appointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No consultations scheduled yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map(a => `
    <tr>
      <td><strong>${App.formatDate(a.appointment_date)}</strong></td>
      <td>${App.formatTime(a.appointment_time)}</td>
      <td>
        <div style="font-weight: 600;">${a.patient_name || 'Patient'}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.patient_phone || ''}</div>
      </td>
      <td>${a.reason}</td>
      <td>
        <span class="badge badge-${a.status.toLowerCase()}">${a.status}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          ${a.status === 'Scheduled' ? `
            <button class="btn btn-primary btn-sm" onclick="openPrescriptionModal(${a.appointment_id})">Prescribe & Complete</button>
            <button class="btn btn-danger btn-sm" onclick="cancelDoctorAppt(${a.appointment_id})">Cancel</button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="viewPatientHistory(${a.patient_id}, '${a.patient_name}')">History</button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadDoctorAvailability() {
  const user = App.getUser();
  const listEl = document.getElementById('availability-slots-list');
  if (!listEl) return;

  try {
    const slots = await App.request(`/api/availability/${user.id}`);
    if (slots.length === 0) {
      listEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No availability slots defined. Add your available hours below.</div>`;
      return;
    }

    listEl.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${slots.map(s => `
          <div style="background: #f1f5f9; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; border: 1px solid var(--border);">
            <span><strong>${App.formatDate(s.available_date)}:</strong> ${App.formatTime(s.start_time)} - ${App.formatTime(s.end_time)}</span>
            <button onclick="removeSlot(${s.availability_id})" style="background: none; border: none; cursor: pointer; color: var(--danger); font-weight: bold;">&times;</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    listEl.innerHTML = `<div style="color: var(--danger); font-size: 0.85rem;">Failed to load slots.</div>`;
  }
}

async function addAvailabilitySlot(event) {
  event.preventDefault();
  const user = App.getUser();
  const date = document.getElementById('avail-date').value;
  const start = document.getElementById('avail-start').value;
  const end = document.getElementById('avail-end').value;

  if (!date || !start || !end) {
    alert('Please enter date, start time, and end time.');
    return;
  }

  try {
    await App.request('/api/availability', {
      method: 'POST',
      body: JSON.stringify({
        doctor_id: user.id,
        available_date: date,
        start_time: start,
        end_time: end,
        is_available: true
      })
    });

    App.showAlert('Availability slot added successfully.', 'success');
    loadDoctorAvailability();
  } catch (err) {
    alert(err.message);
  }
}

async function removeSlot(slotId) {
  try {
    await App.request(`/api/availability/${slotId}`, { method: 'DELETE' });
    loadDoctorAvailability();
  } catch (err) {
    alert(err.message);
  }
}

function openPrescriptionModal(appointmentId) {
  const appt = doctorAppointments.find(a => a.appointment_id === appointmentId);
  if (!appt) return;
  activeAppointmentForRx = appt;

  document.getElementById('rx-patient-name').innerText = appt.patient_name;
  document.getElementById('rx-appointment-reason').innerText = appt.reason;
  document.getElementById('prescription-modal').classList.add('active');
}

async function savePrescription(event) {
  event.preventDefault();
  if (!activeAppointmentForRx) return;

  const user = App.getUser();
  const medicines = document.getElementById('rx-medicines').value.trim();
  const dosage = document.getElementById('rx-dosage').value.trim();
  const instructions = document.getElementById('rx-instructions').value.trim();
  const diagnosis = document.getElementById('rx-diagnosis').value.trim();

  if (!medicines || !dosage || !instructions) {
    alert('Medicines, dosage, and instructions are required.');
    return;
  }

  try {
    // 1. Save prescription
    await App.request('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: activeAppointmentForRx.patient_id,
        doctor_id: user.id,
        appointment_id: activeAppointmentForRx.appointment_id,
        medicines,
        dosage,
        instructions
      })
    });

    // 2. Also log medical record diagnosis if provided
    if (diagnosis) {
      await App.request('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: activeAppointmentForRx.patient_id,
          doctor_id: user.id,
          diagnosis,
          symptoms: activeAppointmentForRx.reason,
          treatment: `Prescribed: ${medicines}. Instructions: ${instructions}`
        })
      });
    }

    closeModal('prescription-modal');
    App.showAlert('Consultation completed and prescription saved!', 'success');
    loadDoctorDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function viewPatientHistory(patientId, patientName) {
  try {
    const records = await App.request(`/api/medical-records/${patientId}`);
    const modal = document.getElementById('history-modal');
    document.getElementById('history-patient-name').innerText = patientName;
    const list = document.getElementById('patient-history-list');

    if (records.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); padding: 1.5rem; text-align: center;">No prior clinical records for this patient.</div>';
    } else {
      list.innerHTML = records.map(r => `
        <div style="border-bottom: 1px solid var(--border); padding: 0.75rem 0;">
          <div style="display: flex; justify-content: space-between;">
            <strong>${r.diagnosis}</strong>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${App.formatDate(r.record_date)}</span>
          </div>
          <p style="font-size: 0.85rem; margin: 0.25rem 0;"><strong>Symptoms:</strong> ${r.symptoms}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted);"><strong>Treatment:</strong> ${r.treatment || 'None specified'}</p>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  } catch (err) {
    alert(err.message);
  }
}

async function cancelDoctorAppt(appointmentId) {
  if (!confirm('Cancel this consultation?')) return;
  try {
    await App.request(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
    App.showAlert('Appointment cancelled.', 'success');
    loadDoctorDashboard();
  } catch (err) {
    alert(err.message);
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
