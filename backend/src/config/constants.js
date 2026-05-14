/**
 * Datos de configuración del sistema de reservas.
 * Centralizados aquí para fácil mantenimiento.
 */

const BLOQUES_HORARIOS = [
  { id: 1, horario: '07:45 - 08:30' },
  { id: 2, horario: '08:30 - 09:15' },
  { id: 3, horario: '09:30 - 10:15' },
  { id: 4, horario: '10:15 - 11:00' },
  { id: 5, horario: '11:15 - 12:00' },
  { id: 6, horario: '12:00 - 12:45' },
  { id: 7, horario: '13:00 - 13:45' },
  { id: 8, horario: '13:45 - 14:30' },
];

const DEPENDENCIAS = [
  {
    id: 'carro_nuevo_1',
    nombre: 'Carro 1 Chromebook Nuevo',
    modelo: 'Acer 311',
    unidades: 50,
  },
  {
    id: 'carro_nuevo_2',
    nombre: 'Carro 2 Chromebook Nuevo',
    modelo: 'Acer 311',
    unidades: 50,
  },
  {
    id: 'carro_basica',
    nombre: 'Carro Chromebook Básica',
    modelo: 'Asus CX1100CN',
    unidades: 30,
  },
  {
    id: 'carro_media',
    nombre: 'Carro Chromebook E.Media',
    modelo: 'Asus CM3200FM1',
    unidades: 30,
  },
  {
    id: 'sala_computacion',
    nombre: 'Sala de Computación',
    modelo: '-',
    unidades: null,
  },
];

const VENTANA_AGENDAMIENTO_MESES = 3;

module.exports = {
  BLOQUES_HORARIOS,
  DEPENDENCIAS,
  VENTANA_AGENDAMIENTO_MESES,
};
