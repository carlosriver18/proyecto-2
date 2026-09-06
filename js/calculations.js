// Funciones de cálculo puras: volumen, e1RM, RIR/RPE, promedios, agregados por grupo muscular.

import { EXERCISES, PROGRAM_DAYS } from './data.js';
import { startOfWeek, roundTo1 } from './utils.js';

export function setVolume(set) {
  if (!set || !set.completed) return 0;
  return (Number(set.weight) || 0) * (Number(set.reps) || 0);
}

export function exerciseVolume(sessionExercise) {
  return (sessionExercise.sets || []).reduce((sum, s) => sum + setVolume(s), 0);
}

export function sessionVolume(session) {
  return (session.exercises || []).reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function sessionSetsCount(session) {
  return (session.exercises || []).reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
}

export function sessionRepsCount(session) {
  return (session.exercises || []).reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce((a, s) => a + (Number(s.reps) || 0), 0),
    0
  );
}

// Fórmula de Epley. Se presenta siempre como "1RM estimado", nunca como máximo real.
export function e1RM(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return roundTo1(w);
  return roundTo1(w * (1 + r / 30));
}

export function rpeToRir(rpe) {
  if (rpe === null || rpe === undefined || rpe === '') return null;
  return Math.max(0, 10 - Number(rpe));
}

export function rirToRpe(rir) {
  if (rir === null || rir === undefined || rir === '') return null;
  return Math.min(10, 10 - Number(rir));
}

// Devuelve el RIR efectivo de una serie, usando RPE como respaldo si no hay RIR directo.
export function effectiveRir(set) {
  if (set.rir !== null && set.rir !== undefined && set.rir !== '') return Number(set.rir);
  if (set.rpe !== null && set.rpe !== undefined && set.rpe !== '') return rpeToRir(set.rpe);
  return null;
}

export function averageRir(sets) {
  const values = sets.filter((s) => s.completed).map(effectiveRir).filter((v) => v !== null);
  if (!values.length) return null;
  return roundTo1(values.reduce((a, b) => a + b, 0) / values.length);
}

export function averageRpe(sets) {
  const values = sets
    .filter((s) => s.completed)
    .map((s) => (s.rpe !== null && s.rpe !== undefined && s.rpe !== '' ? Number(s.rpe) : rirToRpe(s.rir)))
    .filter((v) => v !== null && v !== undefined);
  if (!values.length) return null;
  return roundTo1(values.reduce((a, b) => a + b, 0) / values.length);
}

export function bestE1RMInExercise(sessionExercise) {
  return (sessionExercise.sets || [])
    .filter((s) => s.completed)
    .reduce((best, s) => Math.max(best, e1RM(s.weight, s.reps)), 0);
}

export function maxWeightInExercise(sessionExercise) {
  return (sessionExercise.sets || [])
    .filter((s) => s.completed)
    .reduce((best, s) => Math.max(best, Number(s.weight) || 0), 0);
}

export function weeklyVolume(sessions, referenceDate = new Date()) {
  const start = startOfWeek(referenceDate).getTime();
  const end = start + 7 * 86400000;
  return sessions
    .filter((s) => s.status === 'completed')
    .filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= start && t < end;
    })
    .reduce((sum, s) => sum + sessionVolume(s), 0);
}

export function volumeByMuscleGroup(sessions) {
  const totals = {};
  sessions
    .filter((s) => s.status === 'completed')
    .forEach((session) => {
      session.exercises.forEach((ex) => {
        const info = EXERCISES[ex.exerciseId];
        if (!info) return;
        const completedSets = ex.sets.filter((s) => s.completed).length;
        totals[info.muscleGroup] = (totals[info.muscleGroup] || 0) + completedSets;
      });
    });
  return totals;
}

export function weeklySetsByMuscleGroup(sessions, referenceDate = new Date()) {
  const start = startOfWeek(referenceDate).getTime();
  const end = start + 7 * 86400000;
  const weekSessions = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const t = new Date(s.date).getTime();
    return t >= start && t < end;
  });
  return volumeByMuscleGroup(weekSessions);
}

export function weeklyCompliance(sessions, totalPlannedPerWeek = PROGRAM_DAYS.length, referenceDate = new Date()) {
  const start = startOfWeek(referenceDate).getTime();
  const end = start + 7 * 86400000;
  const completed = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const t = new Date(s.date).getTime();
    return t >= start && t < end;
  }).length;
  return { completed, total: totalPlannedPerWeek, pct: Math.min(100, Math.round((completed / totalPlannedPerWeek) * 100)) };
}

export function computeStreak(sessions) {
  const completedDates = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => s.date.slice(0, 10))
    .sort()
    .reverse();
  if (!completedDates.length) return 0;
  const uniqueDates = [...new Set(completedDates)];
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < uniqueDates.length; i += 1) {
    const d = new Date(uniqueDates[i]);
    const diffDays = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diffDays > 1) break;
    if (diffDays === 0 || diffDays === 1) {
      streak += 1;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}
