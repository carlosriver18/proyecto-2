import { getState } from '../state.js';
import { EXERCISES } from '../data.js';
import { PR_LABELS } from '../prs.js';
import { formatDate } from '../utils.js';

export function renderPRs(container) {
  const state = getState();
  const prs = [...state.prs].sort((a, b) => new Date(b.date) - new Date(a.date));

  const bestByExercise = {};
  prs.forEach((pr) => {
    if (pr.type !== 'weight') return;
    if (!bestByExercise[pr.exerciseId] || pr.value > bestByExercise[pr.exerciseId].value) {
      bestByExercise[pr.exerciseId] = pr;
    }
  });

  container.innerHTML = `
    <div class="page-header"><h1>PRs — Récords personales</h1></div>

    <section class="pr-grid">
      ${Object.values(bestByExercise).length
        ? Object.values(bestByExercise).map((pr) => `
          <div class="card pr-card">
            <span>${EXERCISES[pr.exerciseId]?.name || pr.exerciseId}</span>
            <strong>${pr.value} kg</strong>
            <small>PR de peso · ${formatDate(pr.date)}</small>
          </div>`).join('')
        : '<p class="muted">Aún no hay PRs registrados. ¡Completa tu primera sesión!</p>'}
    </section>

    <section>
      <h3>Historial de PRs</h3>
      ${prs.length
        ? `<div class="pr-history-list">${prs.map(renderPrRow).join('')}</div>`
        : '<p class="muted">Sin registros todavía.</p>'}
    </section>
  `;
}

function renderPrRow(pr) {
  const improvement = pr.previousValue ? `+${(pr.value - pr.previousValue).toFixed(1)}` : 'Nuevo';
  const unit = pr.type === 'volume' ? 'kg (volumen)' : pr.type === 'reps' ? `reps${pr.context ? ` @ ${pr.context}` : ''}` : 'kg';
  return `
    <div class="card pr-history-row">
      <span class="pr-trophy">🏆</span>
      <div>
        <strong>${EXERCISES[pr.exerciseId]?.name || pr.exerciseId}</strong>
        <span class="muted small">${PR_LABELS[pr.type]} · ${formatDate(pr.date)}</span>
      </div>
      <div class="pr-value">
        <strong>${pr.value} ${unit}</strong>
        <span class="muted small">${pr.previousValue ? `Anterior: ${pr.previousValue}` : ''} ${improvement !== 'Nuevo' ? `(${improvement})` : ''}</span>
      </div>
    </div>`;
}
