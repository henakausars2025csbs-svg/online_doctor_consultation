/**
 * Patient Module Functionality:
 * Search doctors, book appointments, cancel appointments, view history & medical records
 */
let currentDoctors = [];
let selectedDoctor = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = App.getUser();
  if (!user || user.role !== 'patient') {
    window.location.href = 'login.html';
    return;
  }

  // Set greeting
  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.innerText = user.name;

  loadPatientDashboard();
});

async function loadPatientDashboard() {
  const user = App.getUser();
  try {
    // 1. Fetch appointments
    const appointments = await App.request(`/api/appointments?patient_id=${user.id}`);
    renderAppointments(appointments);

    // 2. Fetch doctors
    const doctors = await App.request('/api/doctors');
    currentDoctors = doctors;
    renderDoctors(doctors);

    // 3. Fetch medical records
    const records = await App.request(`/api/medical-records/${user.id}`);
    renderMedicalRecords(records);

    // 4. Fetch prescriptions
    const prescriptions = await App.request(`/api/prescriptions/${user.id}`);
    renderPrescriptions(prescriptions);

    // Update stats
    const upcoming = appointments.filter(a => a.status === 'Scheduled').length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    if (document.getElementById('stat-upcoming')) document.getElementById('stat-upcoming').innerText = upcoming;
    if (document.getElementById('stat-completed')) document.getElementById('stat-completed').innerText = completed;
    if (document.getElementById('stat-records')) document.getElementById('stat-records').innerText = records.length;
    if (document.getElementById('stat-prescriptions')) document.getElementById('stat-prescriptions').innerText = prescriptions.length;

  } catch (err) {
    App.showAlert('Failed to load dashboard data: ' + err.message, 'error');
  }
}

function renderAppointments(appointments) {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;

  if (appointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No appointments found. Book your first consultation above!</td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map(a => `
    <tr>
      <td><strong>${App.formatDate(a.appointment_date)}</strong></td>
      <td>${App.formatTime(a.appointment_time)}</td>
      <td>
        <div style="font-weight: 600;">${a.doctor_name || 'Dr. Assigned'}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.doctor_specialization || ''}</div>
      </td>
      <td>${a.reason}</td>
      <td>
        <span class="badge badge-${a.status.toLowerCase()}">${a.status}</span>
      </td>
      <td>
        ${a.status === 'Scheduled' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelAppointment(${a.appointment_id})">Cancel</button>
        ` : `
          <span style="font-size: 0.8rem; color: var(--text-muted);">${a.notes || '—'}</span>
        `}
      </td>
    </tr>
  `).join('');
}

function renderDoctors(doctors) {
  const container = document.getElementById('doctors-grid');
  if (!container) return;

  if (doctors.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No doctors matching criteria.</div>`;
    return;
  }

  container.innerHTML = doctors.map(d => `
    <div class="doctor-card">
      <img src="${d.avatar_url || '/src/assets/images/doctor_dr_sarah_avatar_1793515596480.jpg'}" alt="${d.name}" class="doctor-avatar" />
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h3>${d.name}</h3>
            <span style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">${d.specialization}</span>
          </div>
          <span style="font-weight: 700; color: var(--secondary);">$${d.consultation_fee}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">${d.bio || ''}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">${d.experience_years} years experience</span>
          <button class="btn btn-primary btn-sm" onclick="openBookingModal(${d.doctor_id})">Book Appointment</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderMedicalRecords(records) {
  const list = document.getElementById('records-list');
  if (!list) return;

  if (records.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No medical history entries recorded yet.</div>`;
    return;
  }

  list.innerHTML = records.map(r => `
    <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <h4 style="font-size: 1rem;">${r.diagnosis}</h4>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${App.formatDate(r.record_date)}</span>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.35rem;"><strong>Symptoms:</strong> ${r.symptoms}</p>
      ${r.treatment ? `<p style="font-size: 0.85rem; color: var(--text-muted);"><strong>Treatment:</strong> ${r.treatment}</p>` : ''}
      <div style="font-size: 0.75rem; color: var(--primary); margin-top: 0.35rem;">Recorded by: ${r.doctor_name || 'Self Reported'}</div>
    </div>
  `).join('');
}

function renderPrescriptions(prescriptions) {
  const list = document.getElementById('prescriptions-list');
  if (!list) return;

  if (prescriptions.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No digital prescriptions issued yet.</div>`;
    return;
  }

  list.innerHTML = prescriptions.map(p => `
    <div style="padding: 1rem; border-bottom: 1px solid var(--border); background: #fdfefe; border-radius: var(--radius-md); margin-bottom: 0.75rem; border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between;">
        <h4 style="font-size: 1rem; color: var(--primary);">${p.medicines}</h4>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${App.formatDate(p.prescription_date)}</span>
      </div>
      <p style="font-size: 0.85rem; margin-top: 0.35rem;"><strong>Dosage:</strong> ${p.dosage}</p>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;"><strong>Instructions:</strong> ${p.instructions}</p>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Prescribing Physician: ${p.doctor_name} (${p.doctor_specialization})</div>
    </div>
  `).join('');
}

// Search and filter doctors
function filterDoctors() {
  const search = document.getElementById('doctor-search')?.value.toLowerCase() || '';
  const spec = document.getElementById('specialization-filter')?.value || 'All';

  const filtered = currentDoctors.filter(d => {
    const matchName = d.name.toLowerCase().includes(search) || d.specialization.toLowerCase().includes(search);
    const matchSpec = spec === 'All' || d.specialization === spec;
    return matchName && matchSpec;
  });

  renderDoctors(filtered);
}

// Appointment Booking Flow
async function openBookingModal(doctorId) {
  const doctor = currentDoctors.find(d => d.doctor_id === doctorId);
  if (!doctor) return;
  selectedDoctor = doctor;

  document.getElementById('modal-doctor-name').innerText = doctor.name;
  document.getElementById('modal-doctor-spec').innerText = doctor.specialization;
  document.getElementById('modal-doctor-fee').innerText = `$${doctor.consultation_fee}`;

  // Default date to tomorrow
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dateInput = document.getElementById('booking-date');
  dateInput.min = new Date().toISOString().split('T')[0];
  dateInput.value = tomorrow;

  await loadDoctorSlots(doctor.doctor_id, tomorrow);

  document.getElementById('booking-modal').classList.add('active');
}

async function loadDoctorSlots(doctorId, date) {
  const slotsContainer = document.getElementById('slots-container');
  slotsContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted);">Loading available time slots...</div>';

  try {
    const slots = await App.request(`/api/availability/${doctorId}?date=${date}`);
    if (slots.length === 0) {
      slotsContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted);">No slots available on this date. Please select another date.</div>';
      return;
    }

    slotsContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem;">
        ${slots.map(s => {
          const isBooked = s.is_booked;
          return `
            <button
              type="button"
              class="btn ${isBooked ? 'btn-secondary' : 'btn-secondary slot-btn'}"
              style="${isBooked ? 'opacity: 0.4; cursor: not-allowed; text-decoration: line-through;' : ''}"
              ${isBooked ? 'disabled' : ''}
              onclick="selectSlot(this, '${s.start_time}')"
            >
              ${App.formatTime(s.start_time)}
            </button>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    slotsContainer.innerHTML = `<div style="color: var(--danger); font-size: 0.85rem;">Error loading slots: ${err.message}</div>`;
  }
}

let selectedTimeSlot = '';
function selectSlot(btn, time) {
  document.querySelectorAll('.slot-btn').forEach(b => {
    b.style.backgroundColor = '#ffffff';
    b.style.color = 'var(--secondary)';
    b.style.borderColor = 'var(--border)';
  });

  btn.style.backgroundColor = 'var(--primary)';
  btn.style.color = '#ffffff';
  btn.style.borderColor = 'var(--primary)';
  selectedTimeSlot = time;
}

async function confirmBooking(event) {
  event.preventDefault();
  if (!selectedTimeSlot) {
    alert('Please select a time slot.');
    return;
  }

  const user = App.getUser();
  const date = document.getElementById('booking-date').value;
  const reason = document.getElementById('booking-reason').value.trim();
  const notes = document.getElementById('booking-notes')?.value.trim() || '';

  if (!reason) {
    alert('Please describe your consultation reason or symptoms.');
    return;
  }

  try {
    await App.request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: user.id,
        doctor_id: selectedDoctor.doctor_id,
        appointment_date: date,
        appointment_time: selectedTimeSlot,
        reason,
        notes
      })
    });

    closeModal('booking-modal');
    App.showAlert('Appointment booked successfully!', 'success');
    loadPatientDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    await App.request(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
    App.showAlert('Appointment cancelled successfully.', 'success');
    loadPatientDashboard();
  } catch (err) {
    App.showAlert(err.message, 'error');
  }
}

async function addMedicalRecord(event) {
  event.preventDefault();
  const user = App.getUser();
  const diagnosis = document.getElementById('record-diagnosis').value.trim();
  const symptoms = document.getElementById('record-symptoms').value.trim();
  const treatment = document.getElementById('record-treatment').value.trim();

  try {
    await App.request('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: user.id,
        diagnosis,
        symptoms,
        treatment
      })
    });

    closeModal('record-modal');
    App.showAlert('Medical record added successfully.', 'success');
    loadPatientDashboard();
  } catch (err) {
    alert(err.message);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}
