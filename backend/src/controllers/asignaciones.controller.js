/**
 * Controlador de Asignaciones de Chromebooks
 * Maneja la obtención de alumnos, guardado de números de Chromebook y reportes.
 */
const fs = require('fs');
const path = require('path');

// Cargar alumnos estáticos
let estudiantes = {};
try {
  const dataPath = path.join(__dirname, '..', 'data', 'estudiantes.json');
  if (fs.existsSync(dataPath)) {
    estudiantes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (error) {
  console.error('[Asignaciones] Error al cargar estudiantes.json:', error);
}

module.exports = function createAsignacionesController(db) {
  const asignacionesCol = db.collection('asignaciones');
  const reservasCol = db.collection('reservas');

  return {
    /**
     * GET /api/estudiantes/:curso
     * Retorna el listado de alumnos de un curso.
     * Si no existe, genera alumnos mock para testing.
     */
    async obtenerEstudiantes(req, res) {
      try {
        const { curso } = req.params;
        const cursoKey = decodeURIComponent(curso);

        if (estudiantes[cursoKey]) {
          return res.json({ curso: cursoKey, alumnos: estudiantes[cursoKey] });
        }

        // Generar alumnos mock para pruebas si el curso no tiene lista real
        const alumnosMock = [];
        for (let i = 1; i <= 15; i++) {
          alumnosMock.push(`Alumno Prueba ${i} (${cursoKey})`);
        }
        res.json({ curso: cursoKey, alumnos: alumnosMock, isMock: true });
      } catch (error) {
        console.error('[Asignaciones] Error al obtener estudiantes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/asignaciones/reserva/:reservaId
     * Obtiene la asignación de Chromebooks para una reserva específica.
     */
    async obtenerAsignacionPorReserva(req, res) {
      try {
        const { reservaId } = req.params;
        const doc = await asignacionesCol.doc(reservaId).get();

        if (!doc.exists) {
          return res.json({ asignacion: null });
        }

        res.json({ asignacion: doc.data() });
      } catch (error) {
        console.error('[Asignaciones] Error al obtener asignación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * POST /api/asignaciones
     * Guarda o actualiza la asignación de Chromebooks.
     * Valida que el profesor sea dueño de la reserva o administrador.
     */
    async guardarAsignacion(req, res) {
      try {
        const { reserva_id, alumnos } = req.body;

        if (!reserva_id || !Array.isArray(alumnos)) {
          return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
        }

        // 1. Obtener la reserva para validar propiedad y copiar metadatos
        const reservaDoc = await reservasCol.doc(reserva_id).get();
        if (!reservaDoc.exists) {
          return res.status(404).json({ error: 'La reserva no existe.' });
        }

        const reserva = reservaDoc.data();

        // 2. Verificar autorización (profesor dueño o admin)
        const isOwner = reserva.profesor_uid === req.user.uid;
        // admin.controller define req.user.isAdmin
        // En index.js el middleware inyecta req.user. Si es admin, el userDoc del setup define su rol
        // Busquemos el rol en userDoc si no está en req.user
        let isAdmin = req.user.isAdmin;
        if (isAdmin === undefined) {
          const userDoc = await db.collection('users').doc(req.user.uid).get();
          isAdmin = userDoc.exists && userDoc.data().rol === 'admin';
        }

        if (!isOwner && !isAdmin) {
          return res.status(403).json({ error: 'No tienes permiso para modificar esta asignación.' });
        }

        // 3. Formatear y guardar asignación
        const asignacionData = {
          reserva_id,
          fecha: reserva.fecha,
          bloque: reserva.bloque,
          bloque_horario: reserva.bloque_horario,
          dependencia_id: reserva.dependencia_id,
          dependencia_nombre: reserva.dependencia_nombre,
          curso: reserva.curso,
          asignatura: reserva.asignatura,
          profesor_nombre: reserva.profesor_nombre,
          profesor_email: reserva.profesor_email,
          alumnos, // Array de { nombre: string, chromebook: string }
          updated_at: new Date().toISOString()
        };

        await asignacionesCol.doc(reserva_id).set(asignacionData);

        res.json({ message: 'Asignación guardada exitosamente.', asignacion: asignacionData });
      } catch (error) {
        console.error('[Asignaciones] Error al guardar asignación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/admin/asignaciones
     * Lista todas las asignaciones registradas en el sistema.
     */
    async listarAsignaciones(req, res) {
      try {
        const snapshot = await asignacionesCol.get();
        const asignaciones = snapshot.docs.map(doc => doc.data());
        
        // Ordenar por fecha descendente
        asignaciones.sort((a, b) => b.fecha.localeCompare(a.fecha));

        res.json({ asignaciones });
      } catch (error) {
        console.error('[Asignaciones] Error al listar asignaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
};
