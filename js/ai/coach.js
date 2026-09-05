// Capa de "AI Coach". Fase actual: reglas locales sobre los datos ya calculados
// (ver puntos 38-39 del brief). Cuando se conecte un proveedor LLM, estas funciones
// pasarán a construir el prompt/contexto en lugar de devolver texto directo,
// sin cambiar la forma en que la UI las consume.

import { EXERCISES } from '../data.js';
import { sessionVolume, averageRir, weeklyVolume } from '../calculations.js';
import { actionLabel } from '../progression.js';

export function analyzeWorkout(session, previousSession = null) {
  const messages = [];
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  const plannedSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  if (totalSets >= plannedSets) {
    messages.push('Excelente. Completaste todas las series planificadas.');
  } else if (totalSets > 0) {
    messages.push(`Completaste ${totalSets} de ${plannedSets} series planificadas.`);
  }

  if (previousSession) {
    const vol = sessionVolume(session);
    const prevVol = sessionVolume(previousSession);
    if (prevVol > 0 && vol > prevVol) {
      messages.push('Tu volumen fue superior al de la sesión anterior de este día.');
    } else if (prevVol > 0 && vol < prevVol) {
      messages.push('Tu volumen fue menor al de la sesión anterior. Revisa descanso y nutrición si se repite.');
    }
  }

  const avgRir = averageRir(session.exercises.flatMap((e) => e.sets));
  if (avgRir !== null) {
    if (avgRir <= 0.5) messages.push('Trabajaste muy cerca del fallo. Vigila la recuperación en los próximos días.');
    else if (avgRir >= 3) messages.push('Quedó margen de esfuerzo disponible; en la próxima sesión puedes exigir un poco más.');
  }

  return messages;
}

export function suggestLoad(exercise, sessionExercise, week) {
  // Delegado al motor de reglas de progression.js para evitar lógica duplicada.
  // Import diferido para no crear ciclo de dependencias en el bundle.
  return import('../progression.js').then(({ computeRecommendation }) => computeRecommendation(exercise, sessionExercise, week));
}

export function analyzeRecovery(recoveryEntry) {
  if (!recoveryEntry) return { status: 'RECUPERACIÓN MEDIA', message: 'Aún no registraste tu estado de recuperación hoy.' };
  const { sleep, energy, fatigue, stress } = recoveryEntry;
  const score = (Number(sleep) || 3) + (Number(energy) || 3) + (6 - (Number(fatigue) || 3)) + (6 - (Number(stress) || 3));
  let status = 'RECUPERACIÓN MEDIA';
  if (score >= 16) status = 'RECUPERACIÓN ALTA';
  else if (score <= 9) status = 'RECUPERACIÓN BAJA';

  const messages = {
    'RECUPERACIÓN ALTA': 'Buen estado general. Es un buen día para exigir la carga planificada.',
    'RECUPERACIÓN MEDIA': 'Estado aceptable. Entrena según lo planificado y ajusta si algo se siente pesado.',
    'RECUPERACIÓN BAJA': 'Señales de fatiga acumulada. Considera reducir volumen o intensidad hoy, sin forzar.',
  };
  return { status, message: messages[status] };
}

export function generateWeeklySummary(sessions, referenceDate = new Date()) {
  const vol = weeklyVolume(sessions, referenceDate);
  const completedThisWeek = sessions.filter((s) => s.status === 'completed').length;
  const lines = [`Esta semana completaste ${completedThisWeek} sesión(es) con un volumen total de ${Math.round(vol)} kg.`];
  const recs = sessions
    .filter((s) => s.status === 'completed' && s.recommendations)
    .flatMap((s) => Object.entries(s.recommendations).map(([exId, rec]) => ({ exId, rec })));
  const increases = recs.filter((r) => r.rec.action === 'increase');
  if (increases.length) {
    const names = increases.slice(0, 3).map((r) => EXERCISES[r.exId]?.name || r.exId).join(', ');
    lines.push(`Recomendación: ${actionLabel('increase')} en ${names}.`);
  }
  return lines.join(' ');
}
