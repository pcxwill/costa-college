/**
 * Costa College — Backend API Server
 * Sistema de Reservas de Chromebooks
 *
 * Stack: Express + Firebase Admin SDK
 * Despliegue: Render Web Service
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initializeFirebase } = require('./config/firebase');
const createAuthMiddleware = require('./middleware/auth');
const createReservasController = require('./controllers/reservas.controller');
const createAdminController = require('./controllers/admin.controller');
const { iniciarCronLimpieza, ejecutarLimpiezaManual } = require('./cron/cleanup');
const { BLOQUES_HORARIOS, DEPENDENCIAS } = require('./config/constants');

// ── Inicializar Firebase ────────────────────────────────────────────
const { db, auth: firebaseAuth, isMock } = initializeFirebase();

// ── Express App ─────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares Globales ────────────────────────────────────────────
app.use(express.json());

// CORS — permitir solo el frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5500',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
      return callback(null, true);
    }
    callback(new Error('CORS no permitido para: ' + origin));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' },
});
app.use('/api/', limiter);

// ── Controladores ───────────────────────────────────────────────────
const reservasCtrl = createReservasController(db);
const adminCtrl = createAdminController(db, firebaseAuth, isMock);
const authMiddleware = createAuthMiddleware(firebaseAuth, isMock);

// ── Rutas Públicas ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: isMock ? 'mock (sin Firebase)' : 'production',
    uptime: process.uptime(),
  });
});

// Setup inicial — crear primer admin (protegido por clave)
app.post('/api/setup', adminCtrl.setupInicial);

// Configuración pública del sistema (bloques, dependencias)
app.get('/api/config', reservasCtrl.obtenerConfiguracion);

// ── Rutas de Autenticación (requieren JWT) ──────────────────────────
app.get('/api/reservas', authMiddleware, reservasCtrl.listarMisReservas);
app.get('/api/reservas/todas', authMiddleware, reservasCtrl.listarTodas);
app.get('/api/reservas/disponibilidad', authMiddleware, reservasCtrl.consultarDisponibilidad);
app.get('/api/reservas/semana', authMiddleware, reservasCtrl.vistaSemanal);
app.post('/api/reservas', authMiddleware, reservasCtrl.crearReserva);
app.delete('/api/reservas/:id', authMiddleware, reservasCtrl.cancelarReserva);

// ── Rutas de Administración (requieren JWT + rol admin) ─────────────
app.get('/api/admin/usuarios', authMiddleware, adminCtrl.requireAdmin, adminCtrl.listarUsuarios);
app.post('/api/admin/usuarios', authMiddleware, adminCtrl.requireAdmin, adminCtrl.crearUsuario);
app.put('/api/admin/usuarios/:uid', authMiddleware, adminCtrl.requireAdmin, adminCtrl.actualizarUsuario);
app.delete('/api/admin/usuarios/:uid', authMiddleware, adminCtrl.requireAdmin, adminCtrl.desactivarUsuario);
app.delete('/api/admin/reservas/:id', authMiddleware, adminCtrl.requireAdmin, adminCtrl.eliminarReserva);
app.get('/api/admin/estadisticas', authMiddleware, adminCtrl.requireAdmin, adminCtrl.estadisticas);

// Limpieza manual (solo admin)
app.post('/api/admin/limpieza', authMiddleware, adminCtrl.requireAdmin, async (req, res) => {
  try {
    const resultado = await ejecutarLimpiezaManual(db);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al ejecutar limpieza: ' + error.message });
  }
});

// Endpoint para verificar el rol del usuario autenticado
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : { rol: 'profesor' };
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      nombre: req.user.nombre,
      rol: userData.rol || 'profesor',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ── Error Handler Global ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada: ' + req.path });
});

// ── Iniciar Servidor ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  Costa College — API de Reservas');
  console.log(`  Puerto: ${PORT}`);
  console.log(`  Modo: ${isMock ? '🔶 MOCK (sin Firebase)' : '🟢 Producción'}`);
  console.log(`  CORS: ${allowedOrigins.join(', ')}`);
  console.log('══════════════════════════════════════════════');
  console.log('');

  // Iniciar cron job de limpieza
  iniciarCronLimpieza(db);
});

module.exports = app;
