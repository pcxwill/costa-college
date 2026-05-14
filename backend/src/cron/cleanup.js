/**
 * Cron Job de Limpieza de Base de Datos
 * Frecuencia: Todos los Domingos a las 23:59 hrs
 * Regla: Elimina ÚNICAMENTE registros con fecha_reserva < fecha_actual
 * RESTRICCIÓN: NO usar borrado masivo ni truncamiento de colecciones
 */
const cron = require('node-cron');

function iniciarCronLimpieza(db) {
  // Ejecutar todos los domingos a las 23:59 hrs (hora del servidor)
  // Formato cron: minuto hora dia_mes mes dia_semana
  // '59 23 * * 0' = 23:59 todos los domingos (0 = domingo)
  const job = cron.schedule('59 23 * * 0', async () => {
    console.log('[CRON] ========================================');
    console.log('[CRON] Iniciando limpieza semanal de reservas...');
    console.log(`[CRON] Fecha de ejecución: ${new Date().toISOString()}`);

    try {
      const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Consultar reservas con fecha anterior a hoy
      const reservasAntiguas = await db
        .collection('reservas')
        .where('fecha', '<', hoy)
        .get();

      if (reservasAntiguas.empty) {
        console.log('[CRON] No hay registros históricos para eliminar.');
        console.log('[CRON] ========================================');
        return;
      }

      console.log(`[CRON] Se encontraron ${reservasAntiguas.size} registros históricos.`);

      let eliminados = 0;
      let errores = 0;

      // Borrado UNO POR UNO — NUNCA borrado masivo
      for (const doc of reservasAntiguas.docs) {
        try {
          const data = doc.data();
          await doc.ref.delete();
          eliminados++;
          console.log(
            `[CRON] ✅ Eliminada reserva ${doc.id}: ${data.fecha} B${data.bloque} ${data.dependencia_nombre || 'N/A'} - ${data.profesor_nombre || 'N/A'}`
          );
        } catch (deleteError) {
          errores++;
          console.error(`[CRON] ❌ Error al eliminar reserva ${doc.id}:`, deleteError.message);
          // Continuar con el siguiente — no detener el proceso
        }
      }

      console.log(`[CRON] Resumen: ${eliminados} eliminados, ${errores} errores.`);
      console.log('[CRON] Las reservas futuras NO fueron afectadas.');
      console.log('[CRON] ========================================');
    } catch (error) {
      console.error('[CRON] Error crítico en la limpieza:', error);
      console.log('[CRON] ========================================');
    }
  }, {
    timezone: 'America/Santiago' // Zona horaria de Chile
  });

  console.log('[CRON] ✅ Job de limpieza programado: Domingos 23:59 hrs (America/Santiago)');

  return job;
}

/**
 * Función para ejecutar la limpieza manualmente (para testing o admin)
 */
async function ejecutarLimpiezaManual(db) {
  console.log('[CRON-MANUAL] Ejecutando limpieza manual...');
  const hoy = new Date().toISOString().split('T')[0];

  const reservasAntiguas = await db
    .collection('reservas')
    .where('fecha', '<', hoy)
    .get();

  if (reservasAntiguas.empty) {
    return { eliminados: 0, mensaje: 'No hay registros históricos para eliminar.' };
  }

  let eliminados = 0;
  for (const doc of reservasAntiguas.docs) {
    await doc.ref.delete();
    eliminados++;
  }

  return { eliminados, mensaje: `${eliminados} registros históricos eliminados.` };
}

module.exports = { iniciarCronLimpieza, ejecutarLimpiezaManual };
