const API_URL = 'http://localhost:3000';

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function getCurrentUser() {
    const userJson = localStorage.getItem('tienda_current_user');
    return userJson ? JSON.parse(userJson) : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function setSession(token, user) {
    localStorage.setItem('tienda_token', token);
    localStorage.setItem('tienda_current_user', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('tienda_token');
    localStorage.removeItem('tienda_current_user');
    localStorage.removeItem('tienda_remember');
}

// ============================================
// MANEJAR FORMULARIO DE LOGIN
// ============================================

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        document.getElementById('emailError').textContent = '';
        document.getElementById('passwordError').textContent = '';
        document.getElementById('generalError').textContent = '';

        const email    = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        try {
            const res  = await fetch(`${API_URL}/api/auth/login`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                setSession(data.token, data.user);
                if (remember) localStorage.setItem('tienda_remember', 'true');

                const successMsg = document.createElement('div');
                successMsg.className   = 'success-message';
                successMsg.textContent = `¡Bienvenido ${data.user.name}!`;
                loginForm.insertAdjacentElement('beforebegin', successMsg);

                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                if (data.errors?.email)    document.getElementById('emailError').textContent    = data.errors.email;
                if (data.errors?.password) document.getElementById('passwordError').textContent = data.errors.password;
                if (data.error)            document.getElementById('generalError').textContent  = data.error;
            }
        } catch (err) {
            document.getElementById('generalError').textContent = 'Error de conexión con el servidor';
        }
    });

    const guestBtn = document.querySelector('.btn-secondary');
    if (guestBtn) {
        guestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearSession();
            window.location.href = 'index.html';
        });
    }
}

// ============================================
// MANEJAR FORMULARIO DE REGISTRO
// ============================================

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        document.getElementById('nameError').textContent            = '';
        document.getElementById('registerEmailError').textContent   = '';
        document.getElementById('registerPasswordError').textContent = '';
        document.getElementById('confirmPasswordError').textContent = '';
        document.getElementById('generalRegisterError').textContent = '';

        const name            = document.getElementById('fullName').value;
        const email           = document.getElementById('registerEmail').value;
        const password        = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Las contraseñas no coinciden';
            return;
        }

        try {
            const res  = await fetch(`${API_URL}/api/auth/register`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (res.ok) {
                setSession(data.token, data.user);

                const successMsg = document.createElement('div');
                successMsg.className   = 'success-message';
                successMsg.textContent = '¡Cuenta creada exitosamente! Redirigiendo...';
                registerForm.insertAdjacentElement('beforebegin', successMsg);

                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                if (data.errors?.name)     document.getElementById('nameError').textContent             = data.errors.name;
                if (data.errors?.email)    document.getElementById('registerEmailError').textContent    = data.errors.email;
                if (data.errors?.password) document.getElementById('registerPasswordError').textContent = data.errors.password;
                if (data.error)            document.getElementById('generalRegisterError').textContent  = data.error;
            }
        } catch (err) {
            document.getElementById('generalRegisterError').textContent = 'Error de conexión con el servidor';
        }
    });
}

// ============================================
// NAVBAR - mostrar usuario logueado
// ============================================

function updateNavbar() {
    const currentUser = getCurrentUser();
    const navAuth     = document.querySelector('.nav__auth');

    if (!navAuth) return;

    const loginBtn    = navAuth.querySelector('.nav__btn--login');
    const registerBtn = navAuth.querySelector('.nav__btn--register');

    if (currentUser) {
        if (loginBtn)    loginBtn.style.display    = 'none';
        if (registerBtn) registerBtn.style.display = 'none';

        if (!navAuth.querySelector('.nav__user')) {
            const userEl = document.createElement('div');
            userEl.className = 'nav__user';
            userEl.innerHTML = `
                <button class="nav__user-btn" type="button">
                    <span class="nav__user-name">${currentUser.name.split(' ')[0]}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="nav__user-dropdown">
                    <a href="profile.html" class="nav__user-link">Mi Perfil</a>
                    <button class="nav__user-link nav__user-link--logout" id="navLogoutBtn" type="button">Cerrar sesión</button>
                </div>
            `;
            navAuth.appendChild(userEl);

            userEl.querySelector('.nav__user-btn').addEventListener('click', () => {
                userEl.classList.toggle('nav__user--open');
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav__user')) userEl.classList.remove('nav__user--open');
            });
            document.getElementById('navLogoutBtn').addEventListener('click', () => {
                clearSession();
                window.location.href = 'index.html';
            });
        }
    } else {
        if (loginBtn)    loginBtn.style.display    = '';
        if (registerBtn) registerBtn.style.display = '';
        navAuth.querySelector('.nav__user')?.remove();
    }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
