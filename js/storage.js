// Capa de persistencia. Toda lectura/escritura a localStorage pasa por aquí
// para poder versionar el esquema y evitar que un fallo rompa la aplicación.

const STORAGE_KEY = 'forgefit_data_v1';
const CORRUPT_BACKUP_KEY = 'forgefit_data_v1_corrupt_backup';
export const DATA_VERSION = 1;

function seedData() {
  return {
    version: DATA_VERSION,
    meta: { updatedAt: todayISOSafe() },
    profile: {
      name: '',
      age: null,
      weight: 80,
      height: null,
      goal: 'hypertrophy', // strength | hypertrophy | recomposition | performance
      level: 'intermediate', // beginner | intermediate | advanced
      onboarded: false,
    },
    settings: {
      theme: 'dark', // dark | light
      units: 'kg', // kg | lb
      sounds: true,
      vibration: true,
      defaultRest: 90,
    },
    program: {
      currentWeek: 1,
      startDate: todayISOSafe(),
    },
    exerciseState: {
      bench_press: { currentLoad: 60 },
      squat: { currentLoad: 45 },
      rdl: { currentLoad: 50 },
      ohp_db: { currentLoad: 20 },
      lat_pulldown: { currentLoad: 70 },
      barbell_row: { currentLoad: 45 },
    },
    sessions: [],
    activeSessionId: null,
    prs: [
      makeSeedPr('bench_press', 'weight', 80),
      makeSeedPr('squat', 'weight', 60),
      makeSeedPr('rdl', 'weight', 50),
      makeSeedPr('ohp_db', 'weight', 20),
      makeSeedPr('lat_pulldown', 'weight', 70),
      makeSeedPr('barbell_row', 'weight', 45),
    ],
    bodyMetrics: [
      { id: 'seed_bw', date: todayISOSafe(), weight: 80, waist: null, arm: null, chest: null, thigh: null },
    ],
    recovery: [],
  };
}

function makeSeedPr(exerciseId, type, value) {
  return {
    id: `seed_${exerciseId}_${type}`,
    exerciseId,
    type,
    value,
    previousValue: null,
    date: todayISOSafe(),
    sessionId: null,
    seed: true,
  };
}

function todayISOSafe() {
  try {
    return new Date().toISOString();
  } catch {
    return '';
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function migrate(raw) {
  // Punto de extensión: si DATA_VERSION sube, encadenar migraciones aquí.
  if (!raw.version || raw.version < DATA_VERSION) {
    raw.version = DATA_VERSION;
  }
  if (!raw.meta) {
    raw.meta = { updatedAt: todayISOSafe() };
  }
  return raw;
}

function validateShape(raw) {
  return (
    isPlainObject(raw) &&
    isPlainObject(raw.profile) &&
    isPlainObject(raw.settings) &&
    isPlainObject(raw.program) &&
    Array.isArray(raw.sessions) &&
    Array.isArray(raw.prs)
  );
}

export function load() {
  let lastError = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = seedData();
      save(fresh);
      return { data: fresh, error: null, isNew: true };
    }
    const parsed = JSON.parse(raw);
    if (!validateShape(parsed)) {
      throw new Error('Esquema de datos inválido');
    }
    return { data: migrate(parsed), error: null, isNew: false };
  } catch (err) {
    lastError = err;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      /* localStorage no disponible, ignorar */
    }
    const fresh = seedData();
    save(fresh);
    return {
      data: fresh,
      error:
        'No se pudieron leer tus datos guardados (formato inválido). Se conservó una copia en forgefit_data_v1_corrupt_backup y se inició un perfil nuevo.',
      isNew: true,
      rawError: lastError,
    };
  }
}

export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'No fue posible guardar los datos. Tus datos actuales siguen visibles en pantalla, pero no se guardaron. Libera espacio o exporta un backup.' };
  }
}

export function exportJSON(data) {
  return JSON.stringify(data, null, 2);
}

export function importJSON(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (!validateShape(parsed)) {
    return { ok: false, error: 'El backup no tiene el formato esperado de ForgeFit.' };
  }
  const migrated = migrate(parsed);
  const result = save(migrated);
  if (!result.ok) return result;
  return { ok: true, data: migrated };
}

export function resetAll() {
  const fresh = seedData();
  save(fresh);
  return fresh;
}

export function sessionsToCSV(sessions, exercises) {
  const rows = [
    ['Fecha', 'Dia', 'Ejercicio', 'Serie', 'Peso', 'Reps', 'RIR', 'RPE', 'Completada'],
  ];
  sessions
    .filter((s) => s.status === 'completed')
    .forEach((s) => {
      s.exercises.forEach((ex) => {
        const name = exercises[ex.exerciseId]?.name || ex.exerciseId;
        ex.sets.forEach((set, i) => {
          rows.push([
            s.date.slice(0, 10),
            s.dayTitle || s.dayId,
            name,
            i + 1,
            set.weight ?? '',
            set.reps ?? '',
            set.rir ?? '',
            set.rpe ?? '',
            set.completed ? 'si' : 'no',
          ]);
        });
      });
    });
  return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
