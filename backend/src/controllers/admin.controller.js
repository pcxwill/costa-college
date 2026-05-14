/**
 * Controlador de Administración
 * Gestión de usuarios, reservas y configuración del sistema.
 * Solo accesible por administradores.
 */
module.exports = function createAdminController(db, firebaseAuth, isMock) {
  const reservasCol = db.collection('reservas');
  const usersCol = db.collection('users');

  return {
    /**
     * Middleware: verificar que el usuario es administrador
     */
    async requireAdmin(req, res, next) {
      try {
        const userDoc = await usersCol.doc(req.user.uid).get();
        if (!userDoc.exists || userDoc.data().rol !== 'admin') {
          return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        }
        req.user.isAdmin = true;
        next();
      } catch (error) {
        console.error('[Admin] Error verificando rol:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * POST /api/admin/usuarios — Crear un nuevo usuario (profesor o admin)
     */
    async crearUsuario(req, res) {
      try {
        const { email, password, nombre, rol = 'profesor' } = req.body;

        if (!email || !password || !nombre) {
          return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos.' });
        }

        if (!['profesor', 'admin'].includes(rol)) {
          return res.status(400).json({ error: 'Rol debe ser "profesor" o "admin".' });
        }

        // Crear usuario en Firebase Auth
        let userRecord;
        if (isMock) {
          userRecord = await firebaseAuth.createUser({
            email,
            password,
            displayName: nombre,
          });
        } else {
          userRecord = await firebaseAuth.createUser({
            email,
            password,
            displayName: nombre,
            emailVerified: true,
          });
        }

        // Guardar perfil en Firestore
        await usersCol.doc(userRecord.uid).set({
          email,
          nombre,
          rol,
          activo: true,
          created_at: new Date().toISOString(),
        });

        console.log(`[Admin] ✅ Usuario creado: ${email} (${rol})`);

        res.status(201).json({
          message: 'Usuario creado exitosamente',
          usuario: { uid: userRecord.uid, email, nombre, rol },
        });
      } catch (error) {
        console.error('[Admin] Error al crear usuario:', error);
        if (error.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'El email ya está registrado.' });
        }
        res.status(500).json({ error: 'Error al crear usuario: ' + error.message });
      }
    },

    /**
     * GET /api/admin/usuarios — Listar todos los usuarios
     */
    async listarUsuarios(req, res) {
      try {
        const snapshot = await usersCol.get();
        const usuarios = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        res.json({ usuarios });
      } catch (error) {
        console.error('[Admin] Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * PUT /api/admin/usuarios/:uid — Actualizar un usuario
     */
    async actualizarUsuario(req, res) {
      try {
        const { uid } = req.params;
        const { nombre, rol, activo, password } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (nombre !== undefined) updates.nombre = nombre;
        if (rol !== undefined) updates.rol = rol;
        if (activo !== undefined) updates.activo = activo;

        await usersCol.doc(uid).update(updates);

        if (!isMock) {
          const authUpdates = {};
          if (nombre) authUpdates.displayName = nombre;
          if (password) authUpdates.password = password;
          
          if (Object.keys(authUpdates).length > 0) {
            await firebaseAuth.updateUser(uid, authUpdates);
          }
        }

        console.log(`[Admin] ✏️ Usuario ${uid} actualizado`);
        res.json({ message: 'Usuario actualizado exitosamente.' });
      } catch (error) {
        console.error('[Admin] Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * DELETE /api/admin/usuarios/:uid — Desactivar un usuario
     */
    async desactivarUsuario(req, res) {
      try {
        const { uid } = req.params;

        // No eliminar de Firebase Auth, solo desactivar
        await usersCol.doc(uid).update({
          activo: false,
          updated_at: new Date().toISOString(),
        });

        if (!isMock) {
          await firebaseAuth.updateUser(uid, { disabled: true });
        }

        console.log(`[Admin] 🚫 Usuario ${uid} desactivado`);
        res.json({ message: 'Usuario desactivado exitosamente.' });
      } catch (error) {
        console.error('[Admin] Error al desactivar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * DELETE /api/admin/reservas/:id — Eliminar cualquier reserva (admin)
     */
    async eliminarReserva(req, res) {
      try {
        const { id } = req.params;
        const docRef = reservasCol.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        await docRef.update({
          estado: 'cancelada',
          updated_at: new Date().toISOString(),
          cancelado_por: req.user.email + ' (admin)',
        });

        console.log(`[Admin] ❌ Reserva ${id} eliminada por admin ${req.user.email}`);
        res.json({ message: 'Reserva eliminada exitosamente.' });
      } catch (error) {
        console.error('[Admin] Error al eliminar reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/admin/estadisticas — Dashboard stats
     */
    async estadisticas(req, res) {
      try {
        const hoy = new Date().toISOString().split('T')[0];

        const [activasSnap, usersSnap] = await Promise.all([
          reservasCol.where('estado', '==', 'activa').get(),
          usersCol.get(),
        ]);

        const reservas = activasSnap.docs.map((d) => d.data());
        const futuras = reservas.filter((r) => r.fecha >= hoy);
        const hoyCount = reservas.filter((r) => r.fecha === hoy);

        res.json({
          total_reservas_activas: reservas.length,
          reservas_futuras: futuras.length,
          reservas_hoy: hoyCount.length,
          total_usuarios: usersSnap.size,
        });
      } catch (error) {
        console.error('[Admin] Error estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * POST /api/setup — Crear el primer admin (solo funciona si no hay usuarios)
     * Protegido por ADMIN_SETUP_KEY
     */
    async setupInicial(req, res) {
      try {
        const { setup_key, email, password, nombre } = req.body;

        if (setup_key !== process.env.ADMIN_SETUP_KEY) {
          return res.status(403).json({ error: 'Clave de setup inválida.' });
        }

        // Verificar que no existan usuarios admin
        const adminSnapshot = await usersCol.where('rol', '==', 'admin').get();
        if (!adminSnapshot.empty) {
          return res.status(400).json({ error: 'Ya existe un administrador. Use el panel de admin para crear más.' });
        }

        // Crear usuario admin en Firebase Auth
        let userRecord;
        if (isMock) {
          userRecord = await firebaseAuth.createUser({ email, password, displayName: nombre });
        } else {
          userRecord = await firebaseAuth.createUser({
            email,
            password,
            displayName: nombre,
            emailVerified: true,
          });
        }

        // Guardar en Firestore como admin
        await usersCol.doc(userRecord.uid).set({
          email,
          nombre,
          rol: 'admin',
          activo: true,
          created_at: new Date().toISOString(),
        });

        console.log(`[Setup] ✅ Admin inicial creado: ${email}`);

        res.status(201).json({
          message: 'Administrador inicial creado exitosamente. Ya puede iniciar sesión.',
          usuario: { uid: userRecord.uid, email, nombre, rol: 'admin' },
        });
      } catch (error) {
        console.error('[Setup] Error:', error);
        res.status(500).json({ error: 'Error al crear admin: ' + error.message });
      }
    },
  };
};
