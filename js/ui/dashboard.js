import { getState } from '../state.js';
import { getTodayProgramDay, getWeekProgress, getActiveSession, startSession, getCurrentPeriodization } from '../workouts.js';
import { EXERCISES } from '../data.js';
import { weeklyVolume } from '../calculations.js';
import { formatWeight, formatDate } from '../utils.js';
import { navigate } from '../router.js';
import { showToast } from './common.js';
import { analyzeRecovery } from '../ai/coach.js';

export function renderDashboard(container) {
  const state = getState();
  const today = getTodayProgramDay();
  const week = state.program.currentWeek;
  const periodization = getCurrentPeriodization(state);
  const weekProgress = getWeekProgress(state);
  const active = getActiveSession();
  const vol = Math.round(weeklyVolume(state.sessions));
  const prsThisWeek = state.prs.filter((pr) => {
    const t = new Date(pr.date).getTime();
    return Date.now() - t < 7 * 86400000;
  }).length;
  const lastSessions = [...state.sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);
  const todayCompletedSession = state.sessions.find(
    (s) => s.status === 'completed' && s.dayId === today?.id && s.date.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );
  const recovery = [...state.recovery].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const recoveryToday = recovery && recovery.date.slice(0, 10) === new Date().toISOString().slice(0, 10) ? recovery : null;
  const recoveryInfo = analyzeRecovery(recoveryToday);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">FORGEFIT</p>
        <h1>Semana ${week} / 8 <span class="phase-badge">${periodization.phase}</span></h1>
      </div>
    </div>

    <section class="card progress-card">
      <div class="card-head"><h3>Progreso semanal</h3><span>${weekProgress.pct}%</span></div>
      <div class="progress"><div style="width:${weekProgress.pct}%"></div></div>
      <p class="muted">${weekProgress.completed} / ${weekProgress.total} sesiones · Racha de ${weekProgress.streak} día${weekProgress.streak === 1 ? '' : 's'}</p>
    </section>

    <section class="card today-card">
      <p class="eyebrow">HOY</p>
      ${today
        ? `<h2>${today.day} · ${today.title}</h2>
           <p class="muted">${today.exerciseIds.length} ejercicios · ${today.exerciseIds.reduce((a, id) => a + EXERCISES[id].sets, 0)} series</p>
           ${renderTodayAction(active, todayCompletedSession, today)}`
        : `<h2>Descanso</h2><p class="muted">Hoy no hay sesión programada. Puedes iniciar cualquier día del plan desde la sección Plan.</p>
           <button class="btn btn-secondary" id="go-plan">Ver plan de la semana</button>`}
    </section>

    <section class="stats-grid">
      <div class="card stat-card"><span class="stat-label">Peso corporal</span><strong>${formatWeight(state.profile.weight, state.settings.units)}</strong></div>
      <div class="card stat-card"><span class="stat-label">Volumen semanal</span><strong>${vol.toLocaleString('es-ES')} kg</strong></div>
      <div class="card stat-card"><span class="stat-label">PRs (7 días)</span><strong>+${prsThisWeek}</strong></div>
      <div class="card stat-card"><span class="stat-label">Racha</span><strong>${weekProgress.streak} día${weekProgress.streak === 1 ? '' : 's'}</strong></div>
    </section>

    <section class="card recovery-mini">
      <div class="card-head"><h3>Recuperación</h3><span class="badge">${recoveryInfo.status}</span></div>
      <p class="muted">${recoveryInfo.message}</p>
      <button class="btn btn-sm btn-secondary" id="go-recovery">${recoveryToday ? 'Actualizar registro' : 'Registrar hoy'}</button>
    </section>

    <section>
      <div class="section-title"><h3>Últimos entrenamientos</h3><a href="#/history" data-nav-link>Ver historial</a></div>
      ${lastSessions.length
        ? `<div class="mini-session-list">${lastSessions.map(renderMiniSession).join('')}</div>`
        : '<p class="muted">Aún no completaste ninguna sesión. ¡Empieza hoy!</p>'}
    </section>
  `;

  container.querySelector('#go-plan')?.addEventListener('click', () => navigate('/plan'));
  container.querySelector('#go-recovery')?.addEventListener('click', () => navigate('/profile'));
  container.querySelector('[data-nav-link]')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/history');
  });
  container.querySelector('#start-session')?.addEventListener('click', () => {
    const result = startSession(today.id);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    navigate('/train');
  });
  container.querySelector('#continue-session')?.addEventListener('click', () => navigate('/train'));
}

function renderTodayAction(active, completedToday, today) {
  if (active) {
    return '<button class="btn btn-primary btn-block" id="continue-session">CONTINUAR ENTRENAMIENTO</button>';
  }
  if (completedToday) {
    return '<p class="muted">✓ Sesión de hoy completada. ¡Buen trabajo!</p>';
  }
  return '<button class="btn btn-primary btn-block" id="start-session">COMENZAR ENTRENAMIENTO</button>';
}

function renderMiniSession(session) {
  return `<div class="card mini-session">
    <div>
      <strong>${session.dayTitle}</strong>
      <span class="muted small">${formatDate(session.date)}</span>
    </div>
    <span class="muted small">${session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0)} series</span>
  </div>`;
}
