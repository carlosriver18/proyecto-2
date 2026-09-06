// Ciclo de vida de una sesión de entrenamiento: crear, registrar series, completar/descartar.

import { getState, setState } from './state.js';
import { EXERCISES, getDayById, getDayForWeekday, getPeriodizationForWeek, PROGRAM_DAYS } from './data.js';
import { isoWeekday, todayISO, uid, clamp } from './utils.js';
import { sessionVolume, sessionSetsCount, sessionRepsCount, averageRir, weeklyCompliance, computeStreak } from './calculations.js';
import { computeRecommendation } from './progression.js';
import { detectPRs } from './prs.js';

export function getTodayProgramDay() {
  return getDayForWeekday(isoWeekday(new Date()));
}

export function getRecommendedLoad(exerciseId) {
  const state = getState();
  const stored = state.exerciseState[exerciseId]?.currentLoad;
  return stored !== undefined && stored !== null ? stored : EXERCISES[exerciseId].startingLoad;
}

function buildInitialSets(exercise, targetLoad) {
  return Array.from({ length: exercise.sets }, () => ({
    weight: targetLoad,
    reps: null,
    rir: null,
    rpe: null,
    completed: false,
    note: '',
  }));
}

export function buildSessionExercises(dayId) {
  const day = getDayById(dayId);
  if (!day) return [];
  return day.exerciseIds.map((exerciseId) => {
    const exercise = EXERCISES[exerciseId];
    const targetLoad = getRecommendedLoad(exerciseId);
    return {
      exerciseId,
      targetLoad,
      sets: buildInitialSets(exercise, targetLoad),
      note: '',
    };
  });
}

export function hasResumableSession() {
  const state = getState();
  if (!state.activeSessionId) return null;
  return state.sessions.find((s) => s.id === state.activeSessionId && s.status === 'in_progress') || null;
}

export function getActiveSession() {
  const state = getState();
  if (!state.activeSessionId) return null;
  return state.sessions.find((s) => s.id === state.activeSessionId) || null;
}

export function startSession(dayId) {
  const state = getState();
  const day = getDayById(dayId);
  if (!day) return { ok: false, error: 'Día de entrenamiento no válido.' };
  if (state.activeSessionId) return { ok: false, error: 'Ya existe una sesión en progreso.' };

  const session = {
    id: uid('session'),
    dayId: day.id,
    dayTitle: `${day.day} · ${day.title}`,
    week: state.program.currentWeek,
    date: todayISO(),
    status: 'in_progress',
    startedAt: todayISO(),
    endedAt: null,
    warmupNotes: '',
    notes: '',
    exercises: buildSessionExercises(dayId),
  };

  setState((s) => ({
    ...s,
    sessions: [...s.sessions, session],
    activeSessionId: session.id,
  }));
  return { ok: true, session };
}

function withActiveSession(mutator) {
  const state = getState();
  const session = getActiveSession();
  if (!session) return { ok: false, error: 'No hay una sesión activa.' };
  const updatedSession = mutator(structuredCloneSafe(session));
  const sessions = state.sessions.map((s) => (s.id === session.id ? updatedSession : s));
  const result = setState((s) => ({ ...s, sessions }));
  if (!result.ok) return result;
  return { ok: true, session: updatedSession };
}

function structuredCloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

export function addSet(exerciseId) {
  return withActiveSession((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return session;
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ weight: last?.weight ?? ex.targetLoad, reps: null, rir: null, rpe: null, completed: false, note: '' });
    return session;
  });
}

export function removeSet(exerciseId, index) {
  return withActiveSession((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex || ex.sets.length <= 1) return session;
    ex.sets.splice(index, 1);
    return session;
  });
}

export function validateSetPatch(patch) {
  const errors = [];
  if (patch.weight !== undefined && patch.weight !== null && Number(patch.weight) < 0) errors.push('El peso no puede ser negativo.');
  if (patch.reps !== undefined && patch.reps !== null && Number(patch.reps) < 0) errors.push('Las repeticiones no pueden ser negativas.');
  if (patch.rir !== undefined && patch.rir !== null && (Number(patch.rir) < 0 || Number(patch.rir) > 4)) errors.push('El RIR debe estar entre 0 y 4.');
  if (patch.rpe !== undefined && patch.rpe !== null && (Number(patch.rpe) < 6 || Number(patch.rpe) > 10)) errors.push('El RPE debe estar entre 6 y 10.');
  return errors;
}

export function updateSet(exerciseId, index, patch) {
  const errors = validateSetPatch(patch);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  return withActiveSession((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex || !ex.sets[index]) return session;
    ex.sets[index] = { ...ex.sets[index], ...patch };
    if (patch.rir !== undefined && patch.rir !== null) ex.sets[index].rpe = null;
    if (patch.rpe !== undefined && patch.rpe !== null) ex.sets[index].rir = null;
    return session;
  });
}

export function toggleSetComplete(exerciseId, index) {
  return withActiveSession((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex || !ex.sets[index]) return session;
    ex.sets[index].completed = !ex.sets[index].completed;
    return session;
  });
}

export function setExerciseNote(exerciseId, note) {
  return withActiveSession((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return session;
    ex.note = note;
    return session;
  });
}

export function setWarmupNotes(text) {
  return withActiveSession((session) => ({ ...session, warmupNotes: text }));
}

export function setSessionNotes(text) {
  return withActiveSession((session) => ({ ...session, notes: text }));
}

export function abandonSession() {
  const state = getState();
  const session = getActiveSession();
  if (!session) return { ok: false, error: 'No hay sesión activa.' };
  const sessions = state.sessions.map((s) => (s.id === session.id ? { ...s, status: 'abandoned', endedAt: todayISO() } : s));
  return setState((s) => ({ ...s, sessions, activeSessionId: null }));
}

export function discardResumableSession() {
  return abandonSession();
}

/**
 * Cierra la sesión activa: calcula totales, detecta PRs, genera recomendaciones
 * de progresión por ejercicio y actualiza las cargas guardadas para la próxima vez.
 */
export function completeSession() {
  const state = getState();
  const session = getActiveSession();
  if (!session) return { ok: false, error: 'No hay sesión activa.' };

  const endedAt = todayISO();
  const closedSession = { ...structuredCloneSafe(session), status: 'completed', endedAt };

  const { newPRs, nextExerciseState } = detectPRs(closedSession, state.exerciseState, closedSession.date);

  const recommendations = {};
  const updatedExerciseState = { ...nextExerciseState };
  closedSession.exercises.forEach((sessionExercise) => {
    const exercise = EXERCISES[sessionExercise.exerciseId];
    const rec = computeRecommendation(exercise, sessionExercise, closedSession.week);
    recommendations[sessionExercise.exerciseId] = rec;
    updatedExerciseState[sessionExercise.exerciseId] = {
      ...(updatedExerciseState[sessionExercise.exerciseId] || {}),
      currentLoad: rec.newLoad,
    };
  });

  closedSession.recommendations = recommendations;

  const durationMs = new Date(endedAt).getTime() - new Date(closedSession.startedAt).getTime();
  const summary = {
    durationMs,
    sets: sessionSetsCount(closedSession),
    reps: sessionRepsCount(closedSession),
    volume: sessionVolume(closedSession),
    prCount: newPRs.length,
    avgRir: averageRir(closedSession.exercises.flatMap((e) => e.sets)),
  };

  const sessions = state.sessions.map((s) => (s.id === session.id ? closedSession : s));
  const result = setState((s) => ({
    ...s,
    sessions,
    activeSessionId: null,
    exerciseState: updatedExerciseState,
    prs: [...newPRs, ...s.prs],
  }));

  if (!result.ok) return result;
  return { ok: true, session: closedSession, summary, newPRs, recommendations };
}

export function getWeekProgress(state = getState()) {
  const compliance = weeklyCompliance(state.sessions);
  const streak = computeStreak(state.sessions);
  return { ...compliance, streak };
}

export function advanceWeek() {
  const state = getState();
  const nextWeek = clamp(state.program.currentWeek + 1, 1, 8);
  return setState((s) => ({ ...s, program: { ...s.program, currentWeek: nextWeek } }));
}

export function setWeek(week) {
  const w = clamp(Number(week) || 1, 1, 8);
  return setState((s) => ({ ...s, program: { ...s.program, currentWeek: w } }));
}

export function getCurrentPeriodization(state = getState()) {
  return getPeriodizationForWeek(state.program.currentWeek);
}

export { PROGRAM_DAYS };
