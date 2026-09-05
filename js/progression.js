// Motor de progresión: decide si aumentar, mantener o reducir la carga de un ejercicio
// para la próxima sesión, en base al rendimiento real registrado (no progresiones fijas).

import { averageRir } from './calculations.js';
import { isLowerBody, getPeriodizationForWeek } from './data.js';
import { roundTo1 } from './utils.js';

export const ACTIONS = {
  INCREASE: 'increase',
  MAINTAIN: 'maintain',
  DECREASE: 'decrease',
};

function computeIncrementAmount(exercise, avgRir) {
  const base = exercise.increment || 0;
  if (base <= 0) return 0;
  if (exercise.category === 'main' && isLowerBody(exercise.muscleGroup) && avgRir !== null && avgRir >= 3) {
    return Math.min(base * 2, 5);
  }
  return base;
}

/**
 * @param {object} exercise - definición del catálogo (js/data.js)
 * @param {object} sessionExercise - { targetLoad, sets: [{weight,reps,rir,rpe,completed}] }
 * @param {number} week - semana actual del programa (1-8)
 */
export function computeRecommendation(exercise, sessionExercise, week) {
  const periodization = getPeriodizationForWeek(week);
  const targetLoad = sessionExercise.targetLoad ?? exercise.startingLoad;
  const completedSets = (sessionExercise.sets || []).filter((s) => s.completed);

  if (periodization?.deload) {
    return {
      action: ACTIONS.MAINTAIN,
      newLoad: targetLoad,
      reason: 'Semana de descarga (deload): se mantiene la carga reducida para favorecer la recuperación antes del próximo ciclo.',
    };
  }

  if (!completedSets.length) {
    return {
      action: ACTIONS.MAINTAIN,
      newLoad: targetLoad,
      reason: 'No se registraron series completas suficientes para ajustar la carga.',
    };
  }

  const [minReps, maxReps] = exercise.repRange || [0, 0];
  const allCompleted = sessionExercise.sets.every((s) => s.completed);
  const reachedTop = completedSets.every((s) => (Number(s.reps) || 0) >= maxReps);
  const missedRange = completedSets.some((s) => (Number(s.reps) || 0) < Math.max(0, minReps - 1));
  const avgRir = averageRir(sessionExercise.sets);
  const lowRir = avgRir !== null && avgRir <= 0;

  if (allCompleted && reachedTop && avgRir !== null && avgRir >= 2) {
    const inc = computeIncrementAmount(exercise, avgRir);
    const newLoad = roundTo1(targetLoad + inc);
    return {
      action: ACTIONS.INCREASE,
      newLoad,
      reason: `Completaste todas las series alcanzando ${maxReps} repeticiones con RIR ${avgRir}. Puedes aumentar la carga a ${newLoad} kg.`,
    };
  }

  if (lowRir || missedRange) {
    const dec = exercise.increment || 0;
    const newLoad = Math.max(0, roundTo1(targetLoad - dec));
    return {
      action: ACTIONS.DECREASE,
      newLoad,
      reason: dec > 0
        ? `El RIR promedio fue muy bajo o no completaste el rango de repeticiones objetivo. Se recomienda reducir temporalmente a ${newLoad} kg.`
        : 'El rendimiento cayó respecto a lo esperado. Mantén la carga y prioriza la técnica en la próxima sesión.',
    };
  }

  return {
    action: ACTIONS.MAINTAIN,
    newLoad: targetLoad,
    reason: `No alcanzaste el tope del rango (${maxReps} reps) con margen suficiente. Mantén ${targetLoad} kg para consolidar técnica y fuerza.`,
  };
}

export function actionLabel(action) {
  return { increase: 'Aumentar carga', maintain: 'Mantener carga', decrease: 'Reducir carga' }[action] || action;
}
