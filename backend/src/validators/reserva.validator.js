/**
 * Validador de datos de reserva.
 * Verifica formato, rangos y coherencia antes de llegar al controlador.
 */
const { BLOQUES_HORARIOS, DEPENDENCIAS, VENTANA_AGENDAMIENTO_MESES } = require('../config/constants');

function validarReserva(data) {
  const errores = [];

  // Campos requeridos
  const hasBloques = Array.isArray(data.bloques) && data.bloques.length > 0;
  const hasBloque = data.bloque !== undefined && data.bloque !== null && data.bloque !== '';

  const camposRequeridos = ['fecha', 'dependencia_id', 'curso', 'asignatura', 'actividad'];
  for (const campo of camposRequeridos) {
    if (!data[campo] && data[campo] !== 0) {
      errores.push(`El campo '${campo}' es requerido.`);
    }
  }

  if (!hasBloque && !hasBloques) {
    errores.push("Se requiere al menos un bloque horario ('bloque' o 'bloques').");
  }

  if (errores.length > 0) return { valido: false, errores };

  // Validar formato de fecha (YYYY-MM-DD)
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(data.fecha)) {
    errores.push('El formato de fecha debe ser YYYY-MM-DD.');
  }

  // Validar que la fecha sea válida
  const fecha = new Date(data.fecha + 'T00:00:00');
  if (isNaN(fecha.getTime())) {
    errores.push('La fecha proporcionada no es válida.');
  }

  // Validar ventana de agendamiento
  if (!isNaN(fecha.getTime())) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fecha < hoy) {
      errores.push('No se puede reservar en una fecha pasada.');
    }

    const limiteMax = new Date(hoy);
    limiteMax.setMonth(limiteMax.getMonth() + VENTANA_AGENDAMIENTO_MESES);
    if (fecha > limiteMax) {
      errores.push(`No se puede reservar más allá de ${VENTANA_AGENDAMIENTO_MESES} meses en el futuro.`);
    }
  }

  // Validar bloque horario
  const bloquesArray = hasBloques ? data.bloques.map(Number) : [parseInt(data.bloque, 10)];
  for (const bId of bloquesArray) {
    if (!BLOQUES_HORARIOS.find((b) => b.id === bId)) {
      errores.push(`Bloque horario '${bId}' no es válido. Debe ser 1-8.`);
    }
  }

  // Validar dependencia
  if (!DEPENDENCIAS.find((d) => d.id === data.dependencia_id)) {
    errores.push(`Dependencia '${data.dependencia_id}' no es válida.`);
  }

  // Validar strings no vacíos
  if (typeof data.curso === 'string' && data.curso.trim().length === 0) {
    errores.push('El curso no puede estar vacío.');
  }
  if (typeof data.asignatura === 'string' && data.asignatura.trim().length === 0) {
    errores.push('La asignatura no puede estar vacía.');
  }
  if (typeof data.actividad === 'string' && data.actividad.trim().length === 0) {
    errores.push('La actividad no puede estar vacía.');
  }

  return { valido: errores.length === 0, errores };
}

module.exports = { validarReserva };
