import { getState } from '../state.js';
import { EXERCISES, MUSCLE_GROUPS } from '../data.js';
import { sessionVolume, sessionSetsCount, sessionRepsCount, averageRir } from '../calculations.js';
import { formatDate, formatDurationMs, escapeHtml } from '../utils.js';
import { getRouteParam, navigate } from '../router.js';

let filters = { from: '', to: '', exerciseId: '', muscleGroup: '' };

export function renderHistory(container) {
  const sessionId = getRouteParam();
  if (sessionId) {
    renderDetail(container, sessionId);
  } else {
    renderList(container);
  }
}

function renderList(container) {
  const state = getState();
  const sessions = [...state.sessions]
    .filter((s) => s.status !== 'in_progress')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((s) => matchesFilters(s));

  container.innerHTML = `
    <div class="page-header"><h1>Historial</h1></div>
    <section class="card filters-card">
      <div class="form-row wrap">
        <label>Desde<input type="date" id="f-from" value="${filters.from}"></label>
        <label>Hasta<input type="date" id="f-to" value="${filters.to}"></label>
        <label>Ejercicio
          <select id="f-exercise">
            <option value="">Todos</option>
            ${Object.values(EXERCISES).map((e) => `<option value="${e.id}" ${filters.exerciseId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
          </select>
        </label>
        <label>Grupo muscular
          <select id="f-muscle">
            <option value="">Todos</option>
            ${MUSCLE_GROUPS.map((m) => `<option value="${m}" ${filters.muscleGroup === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-ghost" id="f-clear">Limpiar</button>
      </div>
    </section>

    ${sessions.length
      ? `<div class="history-list">${sessions.map(renderRow).join('')}</div>`
      : '<p class="muted">No hay sesiones que coincidan con el filtro.</p>'}
  `;

  container.querySelector('#f-from').addEventListener('change', (e) => { filters.from = e.target.value; renderHistory(container); });
  container.querySelector('#f-to').addEventListener('change', (e) => { filters.to = e.target.value; renderHistory(container); });
  container.querySelector('#f-exercise').addEventListener('change', (e) => { filters.exerciseId = e.target.value; renderHistory(container); });
  container.querySelector('#f-muscle').addEventListener('change', (e) => { filters.muscleGroup = e.target.value; renderHistory(container); });
  container.querySelector('#f-clear').addEventListener('click', () => { filters = { from: '', to: '', exerciseId: '', muscleGroup: '' }; renderHistory(container); });

  container.querySelectorAll('[data-open-session]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/history/${btn.dataset.openSession}`));
  });
}

function matchesFilters(session) {
  if (filters.from && session.date.slice(0, 10) < filters.from) return false;
  if (filters.to && session.date.slice(0, 10) > filters.to) return false;
  if (filters.exerciseId && !session.exercises.some((e) => e.exerciseId === filters.exerciseId)) return false;
  if (filters.muscleGroup && !session.exercises.some((e) => EXERCISES[e.exerciseId]?.muscleGroup === filters.muscleGroup)) return false;
  return true;
}

function renderRow(session) {
  const prCount = session.status === 'completed' ? countSessionPRs(session) : 0;
  return `
    <button class="card history-row" data-open-session="${session.id}">
      <div>
        <strong>${session.dayTitle}</strong>
        <span class="muted small">${formatDate(session.date)} ${session.status !== 'completed' ? `· ${statusLabel(session.status)}` : ''}</span>
      </div>
      <div class="history-row-stats">
        <span>${sessionSetsCount(session)} series</span>
        <span>${Math.round(sessionVolume(session)).toLocaleString('es-ES')} kg</span>
        ${prCount ? `<span class="pr-tag">+${prCount} PR</span>` : ''}
      </div>
    </button>`;
}

function statusLabel(status) {
  return { abandoned: 'Abandonada', in_progress: 'En progreso', completed: 'Completada' }[status] || status;
}

function countSessionPRs(session) {
  const state = getState();
  return state.prs.filter((pr) => pr.sessionId === session.id).length;
}

function renderDetail(container, sessionId) {
  const state = getState();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) {
    container.innerHTML = '<div class="page-header"><h1>Sesión no encontrada</h1></div><a class="btn btn-secondary" href="#/history">Volver al historial</a>';
    return;
  }
  const prs = state.prs.filter((pr) => pr.sessionId === session.id);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow"><a href="#/history">← Historial</a></p>
        <h1>${session.dayTitle}</h1>
        <p class="muted">${formatDate(session.date)} · Semana ${session.week} · ${statusLabel(session.status) || 'Completada'}</p>
      </div>
    </div>

    <section class="stats-grid">
      <div class="card stat-card"><span class="stat-label">Duración</span><strong>${session.endedAt ? formatDurationMs(new Date(session.endedAt) - new Date(session.startedAt)) : '—'}</strong></div>
      <div class="card stat-card"><span class="stat-label">Series</span><strong>${sessionSetsCount(session)}</strong></div>
      <div class="card stat-card"><span class="stat-label">Repeticiones</span><strong>${sessionRepsCount(session)}</strong></div>
      <div class="card stat-card"><span class="stat-label">Volumen</span><strong>${Math.round(sessionVolume(session)).toLocaleString('es-ES')} kg</strong></div>
      <div class="card stat-card"><span class="stat-label">RIR promedio</span><strong>${averageRir(session.exercises.flatMap((e) => e.sets)) ?? '—'}</strong></div>
      <div class="card stat-card"><span class="stat-label">PRs</span><strong>+${prs.length}</strong></div>
    </section>

    ${session.warmupNotes ? `<section class="card"><h3>Calentamiento</h3><p class="muted">${escapeHtml(session.warmupNotes)}</p></section>` : ''}

    <section>
      <h3>Ejercicios</h3>
      ${session.exercises.map((se) => renderExerciseDetail(se)).join('')}
    </section>

    ${session.notes ? `<section class="card"><h3>Notas</h3><p class="muted">${escapeHtml(session.notes)}</p></section>` : ''}
  `;
}

function renderExerciseDetail(sessionExercise) {
  const exercise = EXERCISES[sessionExercise.exerciseId];
  const name = exercise?.name || sessionExercise.exerciseId;
  return `
    <article class="card">
      <h4>${name}${sessionExercise.note ? ` <span class="muted small">— ${escapeHtml(sessionExercise.note)}</span>` : ''}</h4>
      <table class="detail-table">
        <thead><tr><th>#</th><th>Peso</th><th>Reps</th><th>RIR</th><th>RPE</th><th>✓</th></tr></thead>
        <tbody>
          ${sessionExercise.sets.map((s, i) => `<tr><td>${i + 1}</td><td>${s.weight ?? '—'} kg</td><td>${s.reps ?? '—'}</td><td>${s.rir ?? '—'}</td><td>${s.rpe ?? '—'}</td><td>${s.completed ? '✓' : '—'}</td></tr>`).join('')}
        </tbody>
      </table>
    </article>`;
}
