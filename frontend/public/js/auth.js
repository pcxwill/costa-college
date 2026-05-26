/**
 * Costa College — Auth Module
 * Handles Firebase Authentication + mock mode for local dev
 */
const AUTH_CONFIG = {
  apiKey: "AIzaSyA5sJWxVkCEbp1TozQUQcSNrfejfQFLVXw",
  authDomain: "costa-college.firebaseapp.com",
  projectId: "costa-college",
  storageBucket: "costa-college.firebasestorage.app",
  messagingSenderId: "344726618765",
  appId: "1:344726618765:web:9a8ed9a46a6798aa87d8c4",
  measurementId: "G-CE9Q0Z8ZY9"
};

const API_URL = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3001/api' : 'https://costa-college-api.onrender.com/api');

// State
let currentUser = null;
let userProfile = null;
let authToken = null;
let isMockMode = false;

// ── Initialize ──────────────────────────────────────────────────────
(function initAuth() {
  // Check if Firebase is available
  if (typeof firebase !== 'undefined' && AUTH_CONFIG.apiKey !== 'YOUR_API_KEY') {
    try {
      firebase.initializeApp(AUTH_CONFIG);
      console.log('[Auth] Firebase inicializado');
      setupFirebaseAuth();
    } catch (e) {
      console.warn('[Auth] Firebase no disponible, modo mock activado');
      isMockMode = true;
      setupMockAuth();
    }
  } else {
    console.warn('[Auth] Modo MOCK activado (Firebase no configurado)');
    isMockMode = true;
    setupMockAuth();
  }
})();

function setupFirebaseAuth() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      authToken = await user.getIdToken();
      await loadUserProfile();
      onAuthSuccess();
    } else {
      currentUser = null;
      authToken = null;
      userProfile = null;
      onAuthRequired();
    }
    hideLoading();
  });
}

function setupMockAuth() {
  // Check for saved mock session
  const savedSession = sessionStorage.getItem('mock_auth');
  if (savedSession) {
    const session = JSON.parse(savedSession);
    currentUser = session;
    authToken = 'mock_' + session.uid;
    loadUserProfile().then(() => {
      onAuthSuccess();
      hideLoading();
    });
  } else {
    onAuthRequired();
    hideLoading();
  }
}

// ── Login ───────────────────────────────────────────────────────────
async function login(email, password) {
  if (isMockMode) {
    return mockLogin(email, password);
  }

  try {
    const result = await firebase.auth().signInWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    let message = 'Error al iniciar sesión';
    switch (error.code) {
      case 'auth/user-not-found': message = 'Usuario no encontrado'; break;
      case 'auth/wrong-password': message = 'Contraseña incorrecta'; break;
      case 'auth/invalid-email': message = 'Email inválido'; break;
      case 'auth/too-many-requests': message = 'Demasiados intentos. Intente más tarde.'; break;
      default: message = error.message;
    }
    return { success: false, error: message };
  }
}

async function mockLogin(email, password) {
  // Try to authenticate against the backend
  try {
    // First try to setup if no users exist
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    
    if (health.mode && health.mode.includes('mock')) {
      // In mock mode, create a mock token
      const uid = email.replace(/[@.]/g, '_');
      const mockUser = { uid, email, displayName: email.split('@')[0] };
      currentUser = mockUser;
      authToken = 'mock_' + uid;
      sessionStorage.setItem('mock_auth', JSON.stringify(mockUser));
      
      await loadUserProfile();
      onAuthSuccess();
      return { success: true, user: mockUser };
    }
  } catch (e) {
    console.error('[Auth] Error conectando al backend:', e);
  }

  return { success: false, error: 'No se pudo conectar al servidor. Verifique que el backend esté corriendo.' };
}

// ── Logout ──────────────────────────────────────────────────────────
async function logout() {
  if (!isMockMode && typeof firebase !== 'undefined') {
    await firebase.auth().signOut();
  }
  sessionStorage.removeItem('mock_auth');
  currentUser = null;
  authToken = null;
  userProfile = null;
  window.location.href = '/intranet/';
}

// ── Profile ─────────────────────────────────────────────────────────
async function loadUserProfile() {
  try {
    const res = await apiFetch('/me');
    if (res.ok) {
      userProfile = await res.json();
    } else {
      userProfile = {
        uid: currentUser?.uid,
        email: currentUser?.email,
        nombre: currentUser?.displayName || currentUser?.email?.split('@')[0],
        rol: 'profesor'
      };
    }
  } catch (e) {
    userProfile = {
      uid: currentUser?.uid,
      email: currentUser?.email,
      nombre: currentUser?.displayName || 'Usuario',
      rol: 'profesor'
    };
  }
}

// ── API Helper ──────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return fetch(`${API_URL}${path}`, { ...options, headers });
}

// ── Auth State Handlers ─────────────────────────────────────────────
function onAuthSuccess() {
  // If on login page, redirect to reservas
  if (window.location.pathname.endsWith('/intranet/') || 
      window.location.pathname.endsWith('/intranet/index.html')) {
    window.location.href = 'reservas.html';
  }
}

function onAuthRequired() {
  // If on a protected page, redirect to login
  const path = window.location.pathname;
  if (path.includes('reservas.html') || path.includes('admin.html')) {
    window.location.href = '/intranet/';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 300);
  }
}

// ── Login Form Handler ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');

      btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';
      btn.disabled = true;
      errorEl.classList.remove('show');

      const result = await login(email, password);

      if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.add('show');
        btn.textContent = 'Iniciar Sesión';
        btn.disabled = false;
      }
    });
  }
});

// ── Toast Function ──────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
