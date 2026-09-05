import { getState } from '../state.js';
import { PROGRAM_DAYS, EXERCISES, PERIODIZATION } from '../data.js';
import { advanceWeek, setWeek, getRecommendedLoad } from '../workouts.js';
import { navigate } from '../router.js';
import { showToast } from './common.js';

export function renderPlan(container) {
  const state = getState();
  const week = state.program.currentWeek;
  const periodization = PERIODIZATION[week - 1];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">PROGRAMA DE 8 SEMANAS</p>
        <h1>Semana ${week} / 8${periodization.deload ? ' · DELOAD' : ''}</h1>
      </div>
    </div>

    <section class="card${periodization.deload ? ' deload-card' : ''}">
      <div class="card-head"><h3>${periodization.phase}</h3>
        <select id="week-select">${Array.from({ length: 8 }, (_, i) => i + 1).map((w) => `<option value="${w}" ${w === week ? 'selected' : ''}>Semana ${w}</option>`).join('')}</select>
      </div>
      <p class="muted">${periodization.description}</p>
      ${periodization.deload ? '<p class="deload-note">Semana de descarga: se reduce carga y volumen aproximadamente a la mitad para favorecer la recuperación antes del siguiente ciclo.</p>' : ''}
      <div class="progress"><div style="width:${(week / 8) * 100}%"></div></div>
      <button class="btn btn-secondary" id="advance-week" ${week >= 8 ? 'disabled' : ''}>Avanzar a la semana ${Math.min(8, week + 1)}</button>
    </section>

    <div class="week-grid">
      ${PROGRAM_DAYS.map((day) => renderDayCard(day, periodization)).join('')}
    </div>

    <section>
      <h3>Periodización completa</h3>
      <div class="periodization-list">
        ${PERIODIZATION.map((p) => `
          <div class="card periodization-row${p.week === week ? ' current' : ''}${p.deload ? ' deload-row' : ''}">
            <span>Semana ${p.week}</span><strong>${p.phase}</strong><span class="muted small">${p.description}</span>
          </div>`).join('')}
      </div>
    </section>
  `;

  container.querySelector('#advance-week').addEventListener('click', () => {
    advanceWeek();
    showToast('Semana actualizada.', 'success');
    renderPlan(container);
  });
  container.querySelector('#week-select').addEventListener('change', (e) => {
    setWeek(e.target.value);
    renderPlan(container);
  });
  container.querySelectorAll('[data-go-train]').forEach((btn) => btn.addEventListener('click', () => navigate('/train')));
}

function renderDayCard(day, periodization) {
  return `
    <article class="card day-card">
      <span class="eyebrow">${day.day.toUpperCase()}</span>
      <h3>${day.title}</h3>
      <ul class="day-exercise-list">
        ${day.exerciseIds.map((id) => {
          const ex = EXERCISES[id];
          const load = getRecommendedLoad(id);
          const adjusted = periodization.deload ? Math.round(load * 0.85 * 2) / 2 : load;
          return `<li><span>${ex.name}</span><span class="muted small">${ex.sets}×${ex.repRange[0]}–${ex.repRange[1]} · ${adjusted} kg</span></li>`;
        }).join('')}
      </ul>
      <button class="btn btn-sm btn-secondary" data-go-train>Ir a entrenar</button>
    </article>`;
}
