// ============================================
// SISTEMA DE AUTENTICACIÓN FRONTEND
// ============================================

class AuthManager {
    constructor() {
        this.storageKey = 'tienda_users';
        this.currentUserKey = 'tienda_current_user';
        this.initializeUsers();
    }

    // Inicializar con algunos usuarios de prueba
    initializeUsers() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Usuario Demo',
                    email: 'demo@tienda.com',
                    password: 'demo123', // En un proyecto real, esto estaría hasheado
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.storageKey, JSON.stringify(defaultUsers));
        }
    }

    // Obtener todos los usuarios
    getAllUsers() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    // Registrar nuevo usuario
    register(userData) {
        const users = this.getAllUsers();
        const { name, email, password, confirmPassword, newsletter } = userData;

        // Validaciones
        const errors = {};

        if (!name || name.trim().length < 3) {
            errors.name = 'El nombre debe tener al menos 3 caracteres';
        }

        if (!email || !this.isValidEmail(email)) {
            errors.email = 'Por favor ingresa un email válido';
        }

        if (users.some(u => u.email === email)) {
            errors.email = 'Este email ya está registrado';
        }

        if (!password || password.length < 6) {
            errors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = 'Las contraseñas no coinciden';
        }

        if (Object.keys(errors).length > 0) {
            return { success: false, errors };
        }

        // Crear nuevo usuario
        const newUser = {
            id: Date.now(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // En producción, esto debe estar hasheado
            newsletter: newsletter || false,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        return { success: true, user: newUser };
    }

    // Login
    login(email, password, remember) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email.toLowerCase().trim());

        const errors = {};

        if (!email) {
            errors.email = 'Por favor ingresa tu email';
        } else if (!this.isValidEmail(email)) {
            errors.email = 'Por favor ingresa un email válido';
        }

        if (!password) {
            errors.password = 'Por favor ingresa tu contraseña';
        }

        if (!user) {
            errors.email = 'Email no registrado';
            return { success: false, errors };
        }

        if (user.password !== password) {
            errors.password = 'Contraseña incorrecta';
            return { success: false, errors };
        }

        if (Object.keys(errors).length > 0) {
            return { success: false, errors };
        }

        // Login exitoso
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(this.currentUserKey, JSON.stringify(sessionData));

        if (remember) {
            localStorage.setItem('tienda_remember', 'true');
        }

        return { success: true, user: sessionData };
    }

    // Logout
    logout() {
        localStorage.removeItem(this.currentUserKey);
        localStorage.removeItem('tienda_remember');
    }

    // Obtener usuario actual
    getCurrentUser() {
        const userJson = localStorage.getItem(this.currentUserKey);
        return userJson ? JSON.parse(userJson) : null;
    }

    // Verificar si está logueado
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Obtener usuario por ID
    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(u => u.id === id);
    }

    // Actualizar perfil de usuario
    updateUserProfile(userId, updates) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) return { success: false, error: 'Usuario no encontrado' };

        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        // Actualizar usuario actual si es el mismo
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            const updatedSession = { ...currentUser, ...updates };
            localStorage.setItem(this.currentUserKey, JSON.stringify(updatedSession));
        }

        return { success: true, user: users[userIndex] };
    }
}

// Crear instancia global
const auth = new AuthManager();

// ============================================
// MANEJAR FORMULARIO DE LOGIN
// ============================================

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Limpiar errores previos
        document.getElementById('emailError').textContent = '';
        document.getElementById('passwordError').textContent = '';
        document.getElementById('generalError').textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        const result = auth.login(email, password, remember);

        if (result.success) {
            // Mostrar mensaje de éxito
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = `¡Bienvenido ${result.user.name}!`;
            loginForm.insertAdjacentElement('beforebegin', successMsg);

            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Mostrar errores
            if (result.errors.email) {
                document.getElementById('emailError').textContent = result.errors.email;
            }
            if (result.errors.password) {
                document.getElementById('passwordError').textContent = result.errors.password;
            }
            if (result.errors.general) {
                document.getElementById('generalError').textContent = result.errors.general;
            }
        }
    });

    // Botón de continuar como invitado
    const guestBtn = document.querySelector('.btn-secondary');
    if (guestBtn) {
        guestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem(auth.currentUserKey);
            window.location.href = 'index.html';
        });
    }
}

// ============================================
// MANEJAR FORMULARIO DE REGISTRO
// ============================================

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Limpiar errores previos
        document.getElementById('nameError').textContent = '';
        document.getElementById('registerEmailError').textContent = '';
        document.getElementById('registerPasswordError').textContent = '';
        document.getElementById('confirmPasswordError').textContent = '';
        document.getElementById('generalRegisterError').textContent = '';

        const data = {
            name: document.getElementById('fullName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };

        const result = auth.register(data);

        if (result.success) {
            // Mostrar mensaje de éxito
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = `¡Cuenta creada exitosamente! Redirigiendo...`;
            registerForm.insertAdjacentElement('beforebegin', successMsg);

            // Login automático
            auth.login(data.email, data.password, false);

            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Mostrar errores
            if (result.errors.name) {
                document.getElementById('nameError').textContent = result.errors.name;
            }
            if (result.errors.email) {
                document.getElementById('registerEmailError').textContent = result.errors.email;
            }
            if (result.errors.password) {
                document.getElementById('registerPasswordError').textContent = result.errors.password;
            }
            if (result.errors.confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = result.errors.confirmPassword;
            }
        }
    });
}

// ============================================
// INICIALIZAR EN PÁGINAS PRINCIPALES
// ============================================

// Actualizar navbar con información del usuario
function updateNavbar() {
    const currentUser = auth.getCurrentUser();
    const navMenu = document.querySelector('.nav-menu');

    if (!navMenu) return;

    // Buscar si ya existe el elemento de usuario
    let userLinks = navMenu.querySelector('.user-links');

    if (currentUser) {
        if (!userLinks) {
            userLinks = document.createElement('li');
            userLinks.className = 'nav-item user-links';
            navMenu.appendChild(userLinks);
        }
        userLinks.innerHTML = `
            <span class="nav-user-greeting">Hola, ${currentUser.name}</span>
            <div class="nav-user-menu">
                <a href="profile.html" class="nav-link">Mi Perfil</a>
                <a href="orders.html" class="nav-link">Mis Pedidos</a>
                <a href="#" id="logoutBtn" class="nav-link logout">Cerrar Sesión</a>
            </div>
        `;

        // Evento de logout
        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            auth.logout();
            window.location.reload();
        });
    } else {
        // Mostrar links de login/registro si no está logueado
        if (userLinks) {
            userLinks.remove();
        }
    }
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', updateNavbar);
