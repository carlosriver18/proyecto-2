// Datos estructurados del programa. Separados de la UI a propósito (ver punto 11 del brief):
// ejercicios, días, semanas, series objetivo, RIR, descanso y periodización viven aquí.

export const MUSCLE_GROUPS = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales',
  'Glúteos', 'Pantorrillas', 'Core', 'Espalda baja', 'Cuello', 'Tibial anterior',
];

const LOWER_BODY_GROUPS = new Set(['Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas']);
export function isLowerBody(muscleGroup) {
  return LOWER_BODY_GROUPS.has(muscleGroup);
}

// id, name, category (main|accessory), muscleGroup, equipment, repRange, sets, defaultRest (s),
// startingLoad (kg), increment (kg), notes, isTimeBased (reps representan segundos)
export const EXERCISES = {
  bench_press: { id: 'bench_press', name: 'Bench Press', category: 'main', muscleGroup: 'Pecho', equipment: 'Barra', repRange: [3, 5], sets: 5, defaultRest: 180, startingLoad: 60, increment: 2.5, notes: 'Toque de pecho controlado, escápulas retraídas.' },
  incline_db_press: { id: 'incline_db_press', name: 'Press inclinado con mancuernas', category: 'accessory', muscleGroup: 'Pecho', equipment: 'Mancuernas', repRange: [8, 10], sets: 4, defaultRest: 90, startingLoad: 22.5, increment: 1, notes: 'Codos a ~45°, evita rebotar abajo.' },
  ohp_db: { id: 'ohp_db', name: 'Press militar con mancuernas', category: 'main', muscleGroup: 'Hombros', equipment: 'Mancuernas', repRange: [5, 6], sets: 4, defaultRest: 180, startingLoad: 20, increment: 1, notes: 'Carga por mano. Control total del recorrido.' },
  triceps_pushdown: { id: 'triceps_pushdown', name: 'Tríceps en polea', category: 'accessory', muscleGroup: 'Tríceps', equipment: 'Polea', repRange: [10, 15], sets: 4, defaultRest: 60, startingLoad: 20, increment: 2.5, notes: 'Codos pegados al torso durante todo el recorrido.' },

  squat: { id: 'squat', name: 'Sentadilla', category: 'main', muscleGroup: 'Cuádriceps', equipment: 'Barra', repRange: [3, 5], sets: 5, defaultRest: 180, startingLoad: 45, increment: 2.5, notes: 'Profundidad completa; técnica antes que carga.' },
  deadlift: { id: 'deadlift', name: 'Peso muerto convencional', category: 'main', muscleGroup: 'Isquiosurales', equipment: 'Barra', repRange: [3, 5], sets: 4, defaultRest: 180, startingLoad: 70, increment: 2.5, notes: 'Espalda neutra, empuja el piso con los talones. El levantamiento pesado de la semana en pierna B.' },
  rdl: { id: 'rdl', name: 'Peso muerto rumano (RDL)', category: 'main', muscleGroup: 'Isquiosurales', equipment: 'Barra', repRange: [6, 8], sets: 4, defaultRest: 120, startingLoad: 50, increment: 2.5, notes: 'Cadera hacia atrás, espalda neutra. Versión de volumen, no de carga máxima.' },
  leg_curl: { id: 'leg_curl', name: 'Curl femoral', category: 'accessory', muscleGroup: 'Isquiosurales', equipment: 'Máquina', repRange: [8, 12], sets: 4, defaultRest: 60, startingLoad: 20, increment: 2.5, notes: 'Aislamiento de isquiosurales, control en la fase excéntrica.' },
  leg_extension: { id: 'leg_extension', name: 'Extensión de cuádriceps', category: 'accessory', muscleGroup: 'Cuádriceps', equipment: 'Máquina', repRange: [10, 15], sets: 3, defaultRest: 60, startingLoad: 25, increment: 2.5, notes: 'Aislamiento de cuádriceps, pausa arriba sin bloquear con fuerza excesiva.' },
  calf_raise: { id: 'calf_raise', name: 'Elevación de pantorrilla', category: 'accessory', muscleGroup: 'Pantorrillas', equipment: 'Máquina/mancuernas', repRange: [8, 12], sets: 4, defaultRest: 60, startingLoad: 40, increment: 2.5, notes: 'Rango completo, pausa arriba.' },

  lat_pulldown: { id: 'lat_pulldown', name: 'Jalón al pecho / dominadas', category: 'main', muscleGroup: 'Espalda', equipment: 'Polea/barra', repRange: [6, 8], sets: 4, defaultRest: 120, startingLoad: 70, increment: 2.5, notes: 'Escápulas activas antes de tirar.' },
  barbell_row: { id: 'barbell_row', name: 'Remo con barra', category: 'main', muscleGroup: 'Espalda', equipment: 'Barra', repRange: [6, 8], sets: 4, defaultRest: 120, startingLoad: 45, increment: 2.5, notes: 'Torso estable, tirar hacia el abdomen.' },
  biceps_curl: { id: 'biceps_curl', name: 'Curl de bíceps', category: 'accessory', muscleGroup: 'Bíceps', equipment: 'Mancuernas', repRange: [8, 12], sets: 4, defaultRest: 60, startingLoad: 12, increment: 1, notes: 'Sin balanceo, control en la bajada.' },
  face_pull: { id: 'face_pull', name: 'Face pull', category: 'accessory', muscleGroup: 'Hombros', equipment: 'Polea', repRange: [12, 15], sets: 4, defaultRest: 60, startingLoad: 15, increment: 1, notes: 'Codos altos, rotación externa.' },

  hip_thrust: { id: 'hip_thrust', name: 'Hip thrust', category: 'main', muscleGroup: 'Glúteos', equipment: 'Barra', repRange: [6, 8], sets: 4, defaultRest: 120, startingLoad: 60, increment: 2.5, notes: 'Pausa arriba con máxima contracción de glúteo.' },
  plank: { id: 'plank', name: 'Plancha', category: 'accessory', muscleGroup: 'Core', equipment: 'Peso corporal', repRange: [30, 60], sets: 3, defaultRest: 30, startingLoad: 0, increment: 0, notes: 'Duración en segundos. Cuerpo alineado.', isTimeBased: true },
  bird_dog: { id: 'bird_dog', name: 'Bird dog', category: 'accessory', muscleGroup: 'Core', equipment: 'Peso corporal', repRange: [8, 10], sets: 3, defaultRest: 30, startingLoad: 0, increment: 0, notes: 'Por lado, movimiento controlado.' },

  leg_press: { id: 'leg_press', name: 'Prensa / sentadilla ligera', category: 'main', muscleGroup: 'Cuádriceps', equipment: 'Máquina', repRange: [8, 10], sets: 4, defaultRest: 120, startingLoad: 80, increment: 2.5, notes: 'Rango completo, control en la bajada.' },
  arms_superset_fb: { id: 'arms_superset_fb', name: 'Curl + tríceps (superserie)', category: 'accessory', muscleGroup: 'Bíceps', equipment: 'Mancuernas/polea', repRange: [10, 15], sets: 4, defaultRest: 60, startingLoad: 12, increment: 1, notes: 'Curl seguido de extensión de tríceps sin descanso.' },
  db_press_fb: { id: 'db_press_fb', name: 'Press con mancuernas', category: 'accessory', muscleGroup: 'Pecho', equipment: 'Mancuernas', repRange: [8, 12], sets: 4, defaultRest: 90, startingLoad: 20, increment: 1, notes: 'Carga moderada, técnica limpia. Tercer estímulo de pecho de la semana.' },
  row_fb: { id: 'row_fb', name: 'Remo en polea', category: 'accessory', muscleGroup: 'Espalda', equipment: 'Polea', repRange: [8, 12], sets: 4, defaultRest: 90, startingLoad: 45, increment: 2.5, notes: 'Control escapular en cada repetición. Tercer estímulo de espalda de la semana.' },
};

// Split Torso/Pierna x2 (4 días), orientado a Fuerza nivel intermedio: cada
// patrón principal (press horizontal, press vertical, remo/jalón, sentadilla,
// bisagra de cadera) aparece 2 veces por semana en días distintos — una vez
// pesado (3-5 reps) y otra de volumen (6-12 reps) — en vez de una vez por
// semana como en el split anterior de 5 días. Miércoles y fin de semana quedan
// libres para descanso/recuperación entre sesiones pesadas.
export const PROGRAM_DAYS = [
  { id: 'upper_a', dayIndex: 0, day: 'Lunes', title: 'Torso A · Empuje pesado', exerciseIds: ['bench_press', 'barbell_row', 'row_fb', 'face_pull', 'biceps_curl', 'triceps_pushdown'] },
  { id: 'lower_a', dayIndex: 1, day: 'Martes', title: 'Pierna A · Sentadilla pesada', exerciseIds: ['squat', 'leg_extension', 'rdl', 'leg_curl', 'calf_raise', 'plank'] },
  { id: 'upper_b', dayIndex: 3, day: 'Jueves', title: 'Torso B · Press pesado', exerciseIds: ['ohp_db', 'incline_db_press', 'db_press_fb', 'lat_pulldown', 'arms_superset_fb'] },
  { id: 'lower_b', dayIndex: 4, day: 'Viernes', title: 'Pierna B · Peso muerto pesado', exerciseIds: ['deadlift', 'leg_press', 'hip_thrust', 'calf_raise', 'bird_dog'] },
];

export function getDayById(dayId) {
  return PROGRAM_DAYS.find((d) => d.id === dayId) || null;
}

export function getDayForWeekday(isoWeekdayIdx) {
  return PROGRAM_DAYS.find((d) => d.dayIndex === isoWeekdayIdx) || null;
}

// index 0 = semana 1 ... index 7 = semana 8
export const PERIODIZATION = [
  { week: 1, phase: 'Adaptación', description: 'Base técnica y adaptación neuromuscular.', volumeFactor: 0.9, deload: false },
  { week: 2, phase: 'Progresión', description: 'Aumento progresivo de carga sobre la base construida.', volumeFactor: 1.0, deload: false },
  { week: 3, phase: 'Progresión', description: 'Consolidación de las cargas alcanzadas.', volumeFactor: 1.05, deload: false },
  { week: 4, phase: 'Estabilización', description: 'Mantener técnica limpia bajo mayor carga.', volumeFactor: 1.0, deload: false },
  { week: 5, phase: 'Intensificación', description: 'Mayor esfuerzo relativo, RIR más bajo.', volumeFactor: 1.05, deload: false },
  { week: 6, phase: 'Intensificación', description: 'Continuar intensificando las cargas de trabajo.', volumeFactor: 1.05, deload: false },
  { week: 7, phase: 'Pico de trabajo', description: 'Semana de mayor exigencia del ciclo.', volumeFactor: 1.1, deload: false },
  { week: 8, phase: 'Deload', description: 'Reducción de volumen y carga para favorecer la recuperación.', volumeFactor: 0.5, deload: true },
];

export function getPeriodizationForWeek(week) {
  return PERIODIZATION[clampWeek(week) - 1];
}

function clampWeek(week) {
  return Math.min(8, Math.max(1, week || 1));
}

export const RIR_OPTIONS = [0, 1, 2, 3, 4];
export const RPE_OPTIONS = [6, 7, 8, 9, 10];
export const REST_PRESETS = [60, 90, 120, 150, 180, 240];
