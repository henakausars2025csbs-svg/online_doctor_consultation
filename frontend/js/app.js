/**
 * MediConnect Platform Client API Utility
 */
const API_BASE = window.location.origin;

const App = {
  getUser() {
    const raw = localStorage.getItem('mediconnect_user');
    return raw ? JSON.parse(raw) : null;
  },

  getToken() {
    return localStorage.getItem('mediconnect_token') || '';
  },

  setUser(user, token) {
    if (user) localStorage.setItem('mediconnect_user', JSON.stringify(user));
    if (token) localStorage.setItem('mediconnect_token', token);
  },

  clearUser() {
    localStorage.removeItem('mediconnect_user');
    localStorage.removeItem('mediconnect_token');
  },

  async request(endpoint, options = {}) {
    const user = this.getUser();
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (user) {
      headers['x-user-role'] = user.role;
      headers['x-user-id'] = String(user.id);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  showAlert(message, type = 'success', containerId = 'alert-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="alert alert-${type === 'error' ? 'error' : 'success'}">
        <span>${message}</span>
      </div>
    `;

    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  }
};
