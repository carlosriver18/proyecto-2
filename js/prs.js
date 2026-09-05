// Detección automática de récords personales (PRs).
// Tipos: mayor peso, mayor e1RM, mayor volumen (por sesión) y mejor rendimiento de reps a una carga dada.

import { e1RM, exerciseVolume, maxWeightInExercise, bestE1RMInExercise } from './calculations.js';
import { uid } from './utils.js';

export const PR_TYPES = {
  WEIGHT: 'weight',
  E1RM: 'e1rm',
  VOLUME: 'volume',
  REPS: 'reps',
};

export const PR_LABELS = {
  weight: 'Mayor peso',
  e1rm: 'Mayor 1RM estimado',
  volume: 'Mayor volumen',
  reps: 'Mejor rendimiento de repeticiones',
};

function loadKey(weight) {
  return String(Math.round(Number(weight) * 2) / 2);
}

/**
 * Analiza una sesión completada y devuelve los nuevos PRs detectados,
 * a la vez que actualiza `exerciseState` (mejores marcas) in-place (retorna copia).
 */
export function detectPRs(session, exerciseState, sessionDate = session.date) {
  const newPRs = [];
  const nextExerciseState = { ...exerciseState };

  session.exercises.forEach((sessionExercise) => {
    const completedSets = sessionExercise.sets.filter((s) => s.completed && Number(s.weight) > 0 && Number(s.reps) > 0);
    if (!completedSets.length) return;

    const exerciseId = sessionExercise.exerciseId;
    const prior = nextExerciseState[exerciseId] || {};
    const bestRepsByLoad = { ...(prior.bestRepsByLoad || {}) };

    const maxWeight = maxWeightInExercise(sessionExercise);
    const bestE1rm = bestE1RMInExercise(sessionExercise);
    const volume = exerciseVolume(sessionExercise);

    if (maxWeight > 0 && maxWeight > (prior.bestWeight || 0)) {
      newPRs.push(makePR(exerciseId, PR_TYPES.WEIGHT, maxWeight, prior.bestWeight || 0, sessionDate, session.id));
    }
    if (bestE1rm > 0 && bestE1rm > (prior.bestE1RM || 0)) {
      newPRs.push(makePR(exerciseId, PR_TYPES.E1RM, bestE1rm, prior.bestE1RM || 0, sessionDate, session.id));
    }
    if (volume > 0 && volume > (prior.bestVolume || 0)) {
      newPRs.push(makePR(exerciseId, PR_TYPES.VOLUME, volume, prior.bestVolume || 0, sessionDate, session.id));
    }

    completedSets.forEach((set) => {
      const key = loadKey(set.weight);
      const prevBest = bestRepsByLoad[key] || 0;
      if (Number(set.reps) > prevBest) {
        bestRepsByLoad[key] = Number(set.reps);
        if (prevBest > 0) {
          newPRs.push(makePR(exerciseId, PR_TYPES.REPS, Number(set.reps), prevBest, sessionDate, session.id, `${key} kg`));
        }
      }
    });

    nextExerciseState[exerciseId] = {
      ...prior,
      bestWeight: Math.max(prior.bestWeight || 0, maxWeight),
      bestE1RM: Math.max(prior.bestE1RM || 0, bestE1rm),
      bestVolume: Math.max(prior.bestVolume || 0, volume),
      bestRepsByLoad,
    };
  });

  return { newPRs, nextExerciseState };
}

function makePR(exerciseId, type, value, previousValue, date, sessionId, context = null) {
  return {
    id: uid('pr'),
    exerciseId,
    type,
    value,
    previousValue,
    date,
    sessionId,
    context,
  };
}
