/**
 * Admin Module:
 * Platform KPIs, Doctor Management, Patient Moderation, Appointments Management, Reports
 */
let allDoctors = [];
let allPatients = [];
let allAppointments = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = App.getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }

  loadAdminDashboard();
});

async function loadAdminDashboard() {
  try {
    // 1. Dashboard stats
    const stats = await App.request('/api/admin/dashboard');
    document.getElementById('stat-total-patients').innerText = stats.total_patients;
    document.getElementById('stat-total-doctors').innerText = stats.total_doctors;
    document.getElementById('stat-total-appts').innerText = stats.total_appointments;
    document.getElementById('stat-pending-appts').innerText = stats.pending_appointments;
    document.getElementById('stat-completed-appts').innerText = stats.completed_appointments;
    document.getElementById('stat-revenue').innerText = `$${stats.total_revenue.toFixed(2)}`;

    // 2. Fetch doctors
    allDoctors = await App.request('/api/doctors');
    renderDoctorsTable(allDoctors);

    // 3. Fetch patients
    allPatients = await App.request('/api/patients');
    renderPatientsTable(allPatients);

    // 4. Fetch appointments
    allAppointments = await App.request('/api/appointments');
    renderAppointmentsTable(allAppointments);

    // 5. Fetch reports
    const reports = await App.request('/api/admin/reports');
    renderReports(reports);

  } catch (err) {
    App.showAlert('Error loading admin dashboard: ' + err.message, 'error');
  }
}

function renderDoctorsTable(doctors) {
  const tbody = document.getElementById('admin-doctors-table');
  if (!tbody) return;

  tbody.innerHTML = doctors.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td>${d.specialization}</td>
      <td>${d.email}</td>
      <td>${d.phone_number}</td>
      <td>$${d.consultation_fee}</td>
      <td>
        <span class="badge ${d.is_active ? 'badge-completed' : 'badge-cancelled'}">
          ${d.is_active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td>
        <button class="btn ${d.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="toggleDoctorStatus(${d.doctor_id}, ${!d.is_active})">
          ${d.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  `).join('');
}

function renderPatientsTable(patients) {
  const tbody = document.getElementById('admin-patients-table');
  if (!tbody) return;

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.email}</td>
      <td>${p.phone_number}</td>
      <td>${p.gender}</td>
      <td>${p.date_of_birth}</td>
      <td>${p.appointment_count || 0}</td>
      <td>
        <span class="badge ${p.is_active ? 'badge-completed' : 'badge-cancelled'}">
          ${p.is_active ? 'Active' : 'Suspended'}
        </span>
      </td>
      <td>
        <button class="btn ${p.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="togglePatientStatus(${p.patient_id}, ${!p.is_active})">
          ${p.is_active ? 'Suspend' : 'Reactivate'}
        </button>
      </td>
    </tr>
  `).join('');
}

function renderAppointmentsTable(appointments) {
  const tbody = document.getElementById('admin-appointments-table');
  if (!tbody) return;

  tbody.innerHTML = appointments.map(a => `
    <tr>
      <td>#${a.appointment_id}</td>
      <td>${App.formatDate(a.appointment_date)} ${App.formatTime(a.appointment_time)}</td>
      <td>${a.patient_name}</td>
      <td>${a.doctor_name} (${a.doctor_specialization})</td>
      <td>${a.reason}</td>
      <td>
        <span class="badge badge-${a.status.toLowerCase()}">${a.status}</span>
      </td>
      <td>
        ${a.status === 'Scheduled' ? `
          <button class="btn btn-danger btn-sm" onclick="adminCancelAppointment(${a.appointment_id})">Cancel</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

function renderReports(reports) {
  const specEl = document.getElementById('reports-spec-container');
  if (specEl) {
    specEl.innerHTML = reports.specializations.map(s => `
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
        <span>${s.specialization}</span>
        <strong>${s.doctor_count} doctors</strong>
      </div>
    `).join('');
  }

  const perfTable = document.getElementById('reports-doctor-perf-table');
  if (perfTable) {
    perfTable.innerHTML = reports.doctor_stats.map(d => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.specialization}</td>
        <td>${d.total_consultations}</td>
        <td><span style="color: var(--success); font-weight: 600;">${d.completed_consultations}</span></td>
        <td><span style="color: var(--danger); font-weight: 600;">${d.cancelled_consultations}</span></td>
      </tr>
    `).join('');
  }
}

async function addDoctor(event) {
  event.preventDefault();
  const name = document.getElementById('doc-name').value.trim();
  const specialization = document.getElementById('doc-spec').value;
  const email = document.getElementById('doc-email').value.trim();
  const phone_number = document.getElementById('doc-phone').value.trim();
  const password = document.getElementById('doc-password').value;
  const consultation_fee = parseFloat(document.getElementById('doc-fee').value);
  const experience_years = parseInt(document.getElementById('doc-exp').value, 10);
  const bio = document.getElementById('doc-bio').value.trim();

  try {
    await App.request('/api/doctors', {
      method: 'POST',
      body: JSON.stringify({
        name,
        specialization,
        email,
        phone_number,
        password,
        consultation_fee,
        experience_years,
        bio
      })
    });

    closeModal('add-doctor-modal');
    App.showAlert('New doctor added successfully.', 'success');
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleDoctorStatus(doctorId, activate) {
  try {
    await App.request(`/api/admin/users/doctor/${doctorId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: activate })
    });
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function togglePatientStatus(patientId, activate) {
  try {
    await App.request(`/api/admin/users/patient/${patientId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: activate })
    });
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function adminCancelAppointment(id) {
  if (!confirm('Cancel this consultation?')) return;
  try {
    await App.request(`/api/appointments/${id}`, { method: 'DELETE' });
    loadAdminDashboard();
  } catch (err) {
    alert(err.message);
  }
}

function filterAppointments() {
  const status = document.getElementById('filter-appt-status')?.value || 'All';
  const filtered = status === 'All' ? allAppointments : allAppointments.filter(a => a.status === status);
  renderAppointmentsTable(filtered);
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
