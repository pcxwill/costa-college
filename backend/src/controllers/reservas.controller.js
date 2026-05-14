/**
 * Controlador de Reservas — Lógica de negocio principal.
 * Maneja la creación, consulta, cancelación y validación de colisiones.
 */
const { validarReserva } = require('../validators/reserva.validator');
const { BLOQUES_HORARIOS, DEPENDENCIAS } = require('../config/constants');

module.exports = function createReservasController(db) {
  const reservasCol = db.collection('reservas');

  return {
    /**
     * GET /api/reservas — Lista las reservas del profesor autenticado
     */
    async listarMisReservas(req, res) {
      try {
        const snapshot = await reservasCol
          .where('profesor_uid', '==', req.user.uid)
          .where('estado', '==', 'activa')
          .get();

        const reservas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Ordenar por fecha y bloque
        reservas.sort((a, b) => {
          if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
          return a.bloque - b.bloque;
        });

        res.json({ reservas });
      } catch (error) {
        console.error('[Reservas] Error al listar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/reservas/todas — Lista todas las reservas (para admin o vista general)
     */
    async listarTodas(req, res) {
      try {
        const { fecha_inicio, fecha_fin, dependencia_id } = req.query;

        let query = reservasCol.where('estado', '==', 'activa');

        if (fecha_inicio) {
          query = query.where('fecha', '>=', fecha_inicio);
        }
        if (fecha_fin) {
          query = query.where('fecha', '<=', fecha_fin);
        }

        const snapshot = await query.get();
        let reservas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Filtrar por dependencia si se especificó (post-query para evitar índice compuesto)
        if (dependencia_id) {
          reservas = reservas.filter((r) => r.dependencia_id === dependencia_id);
        }

        reservas.sort((a, b) => {
          if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
          if (a.dependencia_id !== b.dependencia_id) return a.dependencia_id.localeCompare(b.dependencia_id);
          return a.bloque - b.bloque;
        });

        res.json({ reservas });
      } catch (error) {
        console.error('[Reservas] Error al listar todas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/reservas/disponibilidad?fecha=YYYY-MM-DD&dependencia_id=xxx
     * Retorna los bloques disponibles para una fecha y dependencia
     */
    async consultarDisponibilidad(req, res) {
      try {
        const { fecha, dependencia_id } = req.query;

        if (!fecha) {
          return res.status(400).json({ error: 'El parámetro "fecha" es requerido.' });
        }

        let query = reservasCol
          .where('fecha', '==', fecha)
          .where('estado', '==', 'activa');

        const snapshot = await query.get();
        let reservasDelDia = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (dependencia_id) {
          reservasDelDia = reservasDelDia.filter((r) => r.dependencia_id === dependencia_id);
        }

        // Construir mapa de disponibilidad por dependencia y bloque
        const disponibilidad = {};
        for (const dep of DEPENDENCIAS) {
          disponibilidad[dep.id] = {
            ...dep,
            bloques: BLOQUES_HORARIOS.map((bloque) => {
              const reservaExistente = reservasDelDia.find(
                (r) => r.dependencia_id === dep.id && r.bloque === bloque.id
              );
              return {
                ...bloque,
                disponible: !reservaExistente,
                reserva: reservaExistente
                  ? {
                      profesor: reservaExistente.profesor_nombre,
                      curso: reservaExistente.curso,
                      asignatura: reservaExistente.asignatura,
                      actividad: reservaExistente.actividad,
                    }
                  : null,
              };
            }),
          };
        }

        // Si se filtró por dependencia, retornar solo esa
        if (dependencia_id) {
          return res.json({ fecha, disponibilidad: { [dependencia_id]: disponibilidad[dependencia_id] } });
        }

        res.json({ fecha, disponibilidad });
      } catch (error) {
        console.error('[Reservas] Error al consultar disponibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * POST /api/reservas — Crear una nueva reserva
     * Validación de colisiones en el backend (CRÍTICO)
     */
    async crearReserva(req, res) {
      try {
        const { fecha, bloque, dependencia_id, curso, asignatura, actividad } = req.body;

        // 1. Validar datos de entrada
        const validacion = validarReserva({ fecha, bloque, dependencia_id, curso, asignatura, actividad });
        if (!validacion.valido) {
          return res.status(400).json({ error: 'Datos inválidos', errores: validacion.errores });
        }

        const bloqueNum = parseInt(bloque, 10);

        // 2. VALIDACIÓN DE COLISIÓN — ¿Existe ya una reserva para esta dependencia + fecha + bloque?
        const colisionSnapshot = await reservasCol
          .where('fecha', '==', fecha)
          .where('bloque', '==', bloqueNum)
          .where('dependencia_id', '==', dependencia_id)
          .where('estado', '==', 'activa')
          .get();

        if (!colisionSnapshot.empty) {
          const reservaExistente = colisionSnapshot.docs[0].data();
          return res.status(409).json({
            error: 'Colisión de reserva',
            message: `Este bloque ya fue reservado por ${reservaExistente.profesor_nombre} para ${reservaExistente.asignatura}.`,
            reserva_existente: {
              profesor: reservaExistente.profesor_nombre,
              curso: reservaExistente.curso,
              asignatura: reservaExistente.asignatura,
            },
          });
        }

        // 3. Obtener datos de la dependencia y bloque
        const dependencia = DEPENDENCIAS.find((d) => d.id === dependencia_id);
        const bloqueInfo = BLOQUES_HORARIOS.find((b) => b.id === bloqueNum);

        // 4. Crear la reserva
        const nuevaReserva = {
          profesor_uid: req.user.uid,
          profesor_nombre: req.user.nombre,
          profesor_email: req.user.email,
          fecha,
          bloque: bloqueNum,
          bloque_horario: bloqueInfo.horario,
          dependencia_id,
          dependencia_nombre: dependencia.nombre,
          curso: curso.trim(),
          asignatura: asignatura.trim(),
          actividad: actividad.trim(),
          estado: 'activa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const docRef = await reservasCol.add(nuevaReserva);

        console.log(`[Reservas] ✅ Nueva reserva ${docRef.id}: ${fecha} B${bloqueNum} ${dependencia.nombre} por ${req.user.nombre}`);

        res.status(201).json({
          message: 'Reserva creada exitosamente',
          reserva: { id: docRef.id, ...nuevaReserva },
        });
      } catch (error) {
        console.error('[Reservas] Error al crear:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * DELETE /api/reservas/:id — Cancelar una reserva propia (solo futuras)
     */
    async cancelarReserva(req, res) {
      try {
        const { id } = req.params;
        const docRef = reservasCol.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        const reserva = doc.data();

        // Verificar que es del profesor autenticado (a menos que sea admin)
        if (reserva.profesor_uid !== req.user.uid && !req.user.isAdmin) {
          return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva.' });
        }

        // Verificar que la reserva es futura
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaReserva = new Date(reserva.fecha + 'T00:00:00');

        if (fechaReserva < hoy) {
          return res.status(400).json({ error: 'No se puede cancelar una reserva pasada.' });
        }

        // Marcar como cancelada (soft delete)
        await docRef.update({
          estado: 'cancelada',
          updated_at: new Date().toISOString(),
          cancelado_por: req.user.email,
        });

        console.log(`[Reservas] ❌ Reserva ${id} cancelada por ${req.user.email}`);

        res.json({ message: 'Reserva cancelada exitosamente.' });
      } catch (error) {
        console.error('[Reservas] Error al cancelar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/reservas/semana?inicio=YYYY-MM-DD
     * Retorna la disponibilidad de toda la semana (lunes a viernes)
     */
    async vistaSemanal(req, res) {
      try {
        const { inicio } = req.query;
        if (!inicio) {
          return res.status(400).json({ error: 'El parámetro "inicio" es requerido (YYYY-MM-DD).' });
        }

        const fechaInicio = new Date(inicio + 'T00:00:00');
        const dias = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(fechaInicio);
          d.setDate(d.getDate() + i);
          dias.push(d.toISOString().split('T')[0]);
        }

        const fechaFin = dias[dias.length - 1];

        const snapshot = await reservasCol
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fechaFin)
          .where('estado', '==', 'activa')
          .get();

        const reservas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Organizar por día
        const semana = {};
        for (const dia of dias) {
          semana[dia] = reservas.filter((r) => r.fecha === dia);
        }

        res.json({ inicio, fin: fechaFin, dias, semana });
      } catch (error) {
        console.error('[Reservas] Error vista semanal:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    },

    /**
     * GET /api/config — Retorna la configuración del sistema (bloques, dependencias)
     */
    async obtenerConfiguracion(req, res) {
      res.json({
        bloques_horarios: BLOQUES_HORARIOS,
        dependencias: DEPENDENCIAS,
        ventana_agendamiento_meses: 3,
      });
    },
  };
};
