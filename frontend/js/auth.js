/**
 * Authentication handling: Login, Register, Logout
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role')?.value || '';
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.innerText = 'Signing in...';

      try {
        const res = await App.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, role })
        });

        App.setUser(res.user, res.token);
        App.showAlert('Login successful! Redirecting...', 'success');

        setTimeout(() => {
          if (res.user.role === 'admin') window.location.href = 'admin-dashboard.html';
          else if (res.user.role === 'doctor') window.location.href = 'doctor-dashboard.html';
          else window.location.href = 'patient-dashboard.html';
        }, 800);
      } catch (err) {
        App.showAlert(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Sign In';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone_number = document.getElementById('phone_number').value.trim();
      const gender = document.getElementById('gender').value;
      const date_of_birth = document.getElementById('date_of_birth').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (password !== confirmPassword) {
        App.showAlert('Passwords do not match.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating account...';

      try {
        const res = await App.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone_number, gender, date_of_birth, password })
        });

        App.setUser(res.user, res.token);
        App.showAlert('Registration complete! Redirecting to dashboard...', 'success');

        setTimeout(() => {
          window.location.href = 'patient-dashboard.html';
        }, 1000);
      } catch (err) {
        App.showAlert(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Patient Account';
      }
    });
  }
});

function logout() {
  App.clearUser();
  window.location.href = 'login.html';
}
