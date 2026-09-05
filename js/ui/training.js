// Pantalla de entrenamiento: el corazón de la app. Registrar una serie debe tomar
// segundos, por eso los inputs guardan en "change" (blur/enter), no en cada tecla,
// evitando reconstruir el DOM mientras el usuario escribe.

import { getState } from '../state.js';
import { EXERCISES, PROGRAM_DAYS, RIR_OPTIONS, RPE_OPTIONS, getDayById } from '../data.js';
import {
  getActiveSession, getTodayProgramDay, startSession, addSet, removeSet, updateSet,
  toggleSetComplete, setExerciseNote, setWarmupNotes, setSessionNotes, completeSession,
  abandonSession, getRecommendedLoad,
} from '../workouts.js';
import { e1RM } from '../calculations.js';
import { formatDate, formatDurationMs, formatSeconds, escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { showToast, confirmAction, openModal, closeModal } from './common.js';
import * as timer from '../timer.js';
import { analyzeWorkout } from '../ai/coach.js';
import { actionLabel } from '../progression.js';

let elapsedIntervalId = null;

function clearElapsedTicker() {
  if (elapsedIntervalId) {
    clearInterval(elapsedIntervalId);
    elapsedIntervalId = null;
  }
}

export function renderTraining(container) {
  clearElapsedTicker();
  const state = getState();
  const active = getActiveSession();
  if (!active) {
    renderStartScreen(container, state);
  } else {
    renderActiveSession(container, active, state);
  }
}

function renderStartScreen(container, state) {
  const today = getTodayProgramDay();
  container.innerHTML = `
    <div class="page-header"><h1>Entrenamiento</h1></div>
    ${today
      ? `<section class="card">
          <p class="eyebrow">HOY · ${today.day}</p>
          <h2>${today.title}</h2>
          <p class="muted">${today.exerciseIds.map((id) => EXERCISES[id].name).join(' · ')}</p>
          <button class="btn btn-primary btn-block" id="start-today">COMENZAR ENTRENAMIENTO</button>
        </section>`
      : `<section class="card"><p class="muted">Hoy no hay sesión programada en el plan estándar. Puedes iniciar cualquier día manualmente abajo.</p></section>`}

    <section class="card">
      <h3>Iniciar otro día del plan</h3>
      <div class="form-row">
        <select id="day-picker">
          ${PROGRAM_DAYS.map((d) => `<option value="${d.id}">${d.day} · ${d.title}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" id="start-picked">Comenzar</button>
      </div>
    </section>
  `;

  container.querySelector('#start-today')?.addEventListener('click', () => launchSession(today.id, container));
  container.querySelector('#start-picked')?.addEventListener('click', () => {
    const dayId = container.querySelector('#day-picker').value;
    launchSession(dayId, container);
  });
}

function launchSession(dayId, container) {
  const result = startSession(dayId);
  if (!result.ok) {
    showToast(result.error, 'error');
    return;
  }
  renderTraining(container);
}

function getPreviousPerformance(exerciseId, currentSessionId) {
  const state = getState();
  const prior = [...state.sessions]
    .filter((s) => s.status === 'completed' && s.id !== currentSessionId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((s) => s.exercises.some((e) => e.exerciseId === exerciseId));
  if (!prior) return null;
  const ex = prior.exercises.find((e) => e.exerciseId === exerciseId);
  const completed = ex.sets.filter((s) => s.completed);
  if (!completed.length) return null;
  return { date: prior.date, sets: completed };
}

function renderActiveSession(container, session, state) {
  const day = getDayById(session.dayId);
  container.innerHTML = `
    <div class="page-header training-header">
      <div>
        <p class="eyebrow">${day?.day || ''} · SEMANA ${session.week}</p>
        <h1>${day?.title || session.dayTitle}</h1>
      </div>
      <div class="elapsed-chip" title="Duración de la sesión"><span class="elapsed-label">Duración</span><span id="elapsed-time">00:00</span></div>
    </div>

    <details class="card warmup-card">
      <summary>Calentamiento (no cuenta como volumen de trabajo)</summary>
      <textarea id="warmup-notes" rows="2" placeholder="Ej: 5 min cardio suave, movilidad, series de aproximación...">${escapeHtml(session.warmupNotes)}</textarea>
    </details>

    <div class="exercise-session-list">
      ${session.exercises.map((se) => renderExerciseCard(se, session)).join('')}
    </div>

    <section class="card">
      <label>Notas generales de la sesión
        <textarea id="session-notes" rows="3" placeholder="Técnica, sensaciones, molestias...">${escapeHtml(session.notes)}</textarea>
      </label>
    </section>

    <div class="session-footer">
      <button class="btn btn-danger-ghost" id="discard-session">Descartar sesión</button>
      <button class="btn btn-primary btn-block" id="finish-session">FINALIZAR ENTRENAMIENTO</button>
    </div>
  `;

  startElapsedTicker(session.startedAt);
  wireExerciseCards(container, session);

  container.querySelector('#warmup-notes').addEventListener('change', (e) => setWarmupNotes(e.target.value));
  container.querySelector('#session-notes').addEventListener('change', (e) => setSessionNotes(e.target.value));
  container.querySelector('#discard-session').addEventListener('click', () => {
    if (confirmAction('¿Descartar esta sesión? Se marcará como abandonada y no contará en tu progreso.')) {
      abandonSession();
      timer.stop();
      navigate('/dashboard');
    }
  });
  container.querySelector('#finish-session').addEventListener('click', () => finishSession(container));
}

function startElapsedTicker(startedAt) {
  const start = new Date(startedAt).getTime();
  const tick = () => {
    const el = document.getElementById('elapsed-time');
    if (!el) { clearElapsedTicker(); return; }
    el.textContent = formatSeconds((Date.now() - start) / 1000);
  };
  tick();
  elapsedIntervalId = setInterval(tick, 1000);
}

function renderExerciseCard(sessionExercise, session) {
  const exercise = EXERCISES[sessionExercise.exerciseId];
  const previous = getPreviousPerformance(exercise.id, session.id);
  const [minReps, maxReps] = exercise.repRange;
  const unit = exercise.isTimeBased ? 's' : 'reps';

  return `
    <article class="card exercise-card" data-exercise="${exercise.id}">
      <div class="exercise-card-head">
        <div>
          <h3>${exercise.name}</h3>
          <p class="muted small">Objetivo: ${exercise.sets} × ${minReps}–${maxReps} ${unit} · Descanso ${exercise.defaultRest}s</p>
        </div>
        <span class="load-chip">${sessionExercise.targetLoad} kg</span>
      </div>
      ${previous ? `<p class="muted small prev-performance">Anterior (${formatDate(previous.date)}): ${previous.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}</p>` : ''}

      <div class="set-rows">
        <div class="set-row set-row-head muted small">
          <span>#</span><span>Peso</span><span>${exercise.isTimeBased ? 'Seg' : 'Reps'}</span><span>RIR</span><span>RPE</span><span></span><span></span>
        </div>
        ${sessionExercise.sets.map((set, idx) => renderSetRow(exercise, set, idx)).join('')}
      </div>

      <div class="exercise-card-actions">
        <button class="btn btn-sm btn-secondary" data-action="add-set">+ Agregar serie</button>
        <button class="btn btn-sm btn-ghost" data-action="start-rest">Iniciar descanso (${exercise.defaultRest}s)</button>
      </div>
      <label class="exercise-note-label muted small">Nota del ejercicio
        <input type="text" data-action="exercise-note" value="${escapeHtml(sessionExercise.note || '')}" placeholder="Opcional" />
      </label>
    </article>
  `;
}

function renderSetRow(exercise, set, idx) {
  const est = set.weight > 0 && set.reps > 0 ? e1RM(set.weight, set.reps) : null;
  return `
    <div class="set-row${set.completed ? ' completed' : ''}" data-index="${idx}">
      <span class="set-num">${idx + 1}</span>
      <input type="number" min="0" step="0.5" class="set-input" data-field="weight" value="${set.weight ?? ''}" aria-label="Peso serie ${idx + 1}" />
      <input type="number" min="0" step="1" class="set-input" data-field="reps" value="${set.reps ?? ''}" aria-label="Repeticiones serie ${idx + 1}" />
      <select data-field="rir" aria-label="RIR serie ${idx + 1}">
        <option value="">—</option>
        ${RIR_OPTIONS.map((v) => `<option value="${v}" ${set.rir !== null && set.rir !== undefined && Number(set.rir) === v ? 'selected' : ''}>${v === 4 ? '4+' : v}</option>`).join('')}
      </select>
      <select data-field="rpe" aria-label="RPE serie ${idx + 1}">
        <option value="">—</option>
        ${RPE_OPTIONS.map((v) => `<option value="${v}" ${set.rpe !== null && set.rpe !== undefined && Number(set.rpe) === v ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <button class="set-complete-btn" data-action="toggle-complete" aria-pressed="${set.completed}" aria-label="Marcar serie ${idx + 1} completa">${set.completed ? '✓' : ''}</button>
      <button class="set-remove-btn" data-action="remove-set" aria-label="Eliminar serie ${idx + 1}">×</button>
      ${est ? `<span class="set-e1rm muted small">1RM est. ${est} kg</span>` : ''}
    </div>
  `;
}

function wireExerciseCards(container, session) {
  container.querySelectorAll('.exercise-card').forEach((card) => {
    const exerciseId = card.dataset.exercise;
    const exercise = EXERCISES[exerciseId];

    card.querySelector('[data-action="add-set"]').addEventListener('click', () => {
      addSet(exerciseId);
      renderTraining(container);
    });

    card.querySelector('[data-action="start-rest"]').addEventListener('click', () => {
      timer.start(exercise.defaultRest, exercise.name);
    });

    card.querySelector('[data-action="exercise-note"]').addEventListener('change', (e) => {
      setExerciseNote(exerciseId, e.target.value);
    });

    card.querySelectorAll('.set-row:not(.set-row-head)').forEach((row) => {
      const idx = Number(row.dataset.index);

      row.querySelectorAll('.set-input, select').forEach((input) => {
        input.addEventListener('change', () => {
          const field = input.dataset.field;
          const raw = input.value;
          const patch = { [field]: raw === '' ? null : Number(raw) };
          const result = updateSet(exerciseId, idx, patch);
          if (!result.ok) {
            showToast(result.error, 'error');
          }
          renderTraining(container);
        });
      });

      row.querySelector('[data-action="toggle-complete"]').addEventListener('click', () => {
        const wasCompleted = row.classList.contains('completed');
        toggleSetComplete(exerciseId, idx);
        if (!wasCompleted) {
          timer.start(exercise.defaultRest, exercise.name);
        }
        renderTraining(container);
      });

      row.querySelector('[data-action="remove-set"]').addEventListener('click', () => {
        removeSet(exerciseId, idx);
        renderTraining(container);
      });
    });
  });
}

function finishSession(container) {
  const activeBefore = getActiveSession();
  if (!activeBefore) return;
  const totalPlanned = activeBefore.exercises.reduce((a, e) => a + e.sets.length, 0);
  const totalCompleted = activeBefore.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  if (totalCompleted === 0) {
    showToast('Registra al menos una serie antes de finalizar.', 'error');
    return;
  }
  if (totalCompleted < totalPlanned && !confirmAction(`Completaste ${totalCompleted} de ${totalPlanned} series. ¿Finalizar de todas formas?`)) {
    return;
  }

  const result = completeSession();
  timer.stop();
  if (!result.ok) {
    showToast(result.error, 'error');
    return;
  }
  showSessionSummary(result);
}

function showSessionSummary(result) {
  const { session, summary, newPRs, recommendations } = result;
  const messages = analyzeWorkout(session);
  const recLines = Object.entries(recommendations)
    .filter(([, rec]) => rec.action !== 'maintain')
    .map(([exId, rec]) => `<li><strong>${EXERCISES[exId].name}:</strong> ${actionLabel(rec.action)} → ${rec.newLoad} kg</li>`);

  openModal(
    `
    <div class="session-summary">
      <p class="eyebrow">SESIÓN COMPLETADA</p>
      <h2>${session.dayTitle}</h2>
      <div class="summary-grid">
        <div><span>Duración</span><strong>${formatDurationMs(summary.durationMs)}</strong></div>
        <div><span>Series</span><strong>${summary.sets}</strong></div>
        <div><span>Repeticiones</span><strong>${summary.reps}</strong></div>
        <div><span>Volumen</span><strong>${Math.round(summary.volume).toLocaleString('es-ES')} kg</strong></div>
        <div><span>PRs</span><strong>+${summary.prCount}</strong></div>
        <div><span>RIR promedio</span><strong>${summary.avgRir ?? '—'}</strong></div>
      </div>
      ${newPRs.length ? `<p class="pr-callout">🏆 ¡${newPRs.length} nuevo(s) PR!</p>` : ''}
      ${messages.map((m) => `<p class="muted small">${m}</p>`).join('')}
      ${recLines.length ? `<ul class="rec-list">${recLines.join('')}</ul>` : ''}
      <div class="onboarding-actions">
        <button class="btn btn-secondary" id="sum-history">Ver resumen completo</button>
        <button class="btn btn-primary" id="sum-dashboard">Volver al inicio</button>
      </div>
    </div>`,
    {
      onMount: (root) => {
        root.querySelector('#sum-history').addEventListener('click', () => {
          closeModal();
          navigate(`/history/${session.id}`);
        });
        root.querySelector('#sum-dashboard').addEventListener('click', () => {
          closeModal();
          navigate('/dashboard');
        });
      },
    }
  );
}
