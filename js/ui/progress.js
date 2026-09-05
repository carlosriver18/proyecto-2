import { getState } from '../state.js';
import { EXERCISES, MUSCLE_GROUPS } from '../data.js';
import { weeklySetsByMuscleGroup } from '../calculations.js';
import {
  renderBodyweightChart, renderLiftChart, renderE1RMChart, renderWeeklyVolumeChart, renderComplianceChart,
} from '../charts.js';

const RANGES = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '8w', label: '8 semanas' },
  { value: 'all', label: 'Todo' },
];

let selectedRange = 'all';
let selectedLiftExercise = 'bench_press';
let selectedE1rmExercise = 'bench_press';

const KEY_LIFTS = ['bench_press', 'squat', 'rdl'];

export function renderProgress(container) {
  const state = getState();
  const muscleVolume = weeklySetsByMuscleGroup(state.sessions);

  container.innerHTML = `
    <div class="page-header">
      <div><p class="eyebrow">PROGRESO</p><h1>Tu evolución</h1></div>
      <select id="range-select">${RANGES.map((r) => `<option value="${r.value}" ${r.value === selectedRange ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
    </div>

    <section class="card chart-card">
      <h3>Peso corporal</h3>
      <div class="chart-wrap"><canvas id="chart-bodyweight"></canvas></div>
    </section>

    <section class="card chart-card">
      <div class="card-head">
        <h3>Progresión de carga</h3>
        <select id="lift-select">${KEY_LIFTS.map((id) => `<option value="${id}" ${id === selectedLiftExercise ? 'selected' : ''}>${EXERCISES[id].name}</option>`).join('')}</select>
      </div>
      <div class="chart-wrap"><canvas id="chart-lift"></canvas></div>
    </section>

    <section class="card chart-card">
      <div class="card-head">
        <h3>1RM estimado</h3>
        <select id="e1rm-select">${Object.values(EXERCISES).filter((e) => e.category === 'main').map((e) => `<option value="${e.id}" ${e.id === selectedE1rmExercise ? 'selected' : ''}>${e.name}</option>`).join('')}</select>
      </div>
      <div class="chart-wrap"><canvas id="chart-e1rm"></canvas></div>
      <p class="muted small">Estimado con fórmula de Epley: 1RM = peso × (1 + reps/30). No es un máximo real.</p>
    </section>

    <section class="card chart-card">
      <h3>Volumen semanal</h3>
      <div class="chart-wrap"><canvas id="chart-volume"></canvas></div>
    </section>

    <section class="card chart-card">
      <h3>Cumplimiento semanal</h3>
      <div class="chart-wrap"><canvas id="chart-compliance"></canvas></div>
    </section>

    <section class="card">
      <h3>Series semanales por grupo muscular</h3>
      <div class="muscle-volume-list">
        ${MUSCLE_GROUPS.map((mg) => `
          <div class="muscle-volume-row">
            <span>${mg}</span>
            <div class="mini-bar"><div style="width:${Math.min(100, (muscleVolume[mg] || 0) * 6)}%"></div></div>
            <span class="muted small">${muscleVolume[mg] || 0} series</span>
          </div>`).join('')}
      </div>
    </section>
  `;

  drawCharts(state);

  container.querySelector('#range-select').addEventListener('change', (e) => { selectedRange = e.target.value; drawCharts(getState()); });
  container.querySelector('#lift-select').addEventListener('change', (e) => { selectedLiftExercise = e.target.value; drawCharts(getState()); });
  container.querySelector('#e1rm-select').addEventListener('change', (e) => { selectedE1rmExercise = e.target.value; drawCharts(getState()); });
}

function drawCharts(state) {
  renderBodyweightChart('chart-bodyweight', state.bodyMetrics, selectedRange);
  renderLiftChart('chart-lift', state.sessions, selectedLiftExercise, EXERCISES[selectedLiftExercise].name, selectedRange);
  renderE1RMChart('chart-e1rm', state.sessions, selectedE1rmExercise, EXERCISES[selectedE1rmExercise].name, selectedRange);
  renderWeeklyVolumeChart('chart-volume', state.sessions, 8);
  renderComplianceChart('chart-compliance', state.sessions, 8, 5);
}
