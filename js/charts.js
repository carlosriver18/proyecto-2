// Envoltorio fino sobre Chart.js (cargado por CDN en index.html). Si la librería
// no está disponible (sin conexión la primera carga, CDN bloqueado) la app sigue
// funcionando: cada función revisa `window.Chart` antes de dibujar.

import { e1RM } from './calculations.js';
import { dateOnly, startOfWeek } from './utils.js';
import { PROGRAM_DAYS } from './data.js';

const registry = new Map();

function isAvailable() {
  return typeof window !== 'undefined' && typeof window.Chart !== 'undefined';
}

function destroy(canvasId) {
  const existing = registry.get(canvasId);
  if (existing) {
    existing.destroy();
    registry.delete(canvasId);
  }
}

const PALETTE = {
  line: '#7dd3fc',
  line2: '#f0b429',
  grid: 'rgba(255,255,255,0.08)',
  text: '#9aa4b2',
};

function baseOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: PALETTE.text } } },
    scales: {
      x: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } },
      y: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } },
    },
    ...overrides,
  };
}

function rangeStartDate(range) {
  const now = new Date();
  if (range === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (range === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (range === '8w') return new Date(now.getTime() - 56 * 86400000);
  return new Date(0);
}

export function renderNoDataMessage(canvasId, message = 'Aún no hay datos suficientes para este gráfico.') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  destroy(canvasId);
  canvas.style.display = 'none';
  let msg = wrap.querySelector('.chart-empty');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'chart-empty muted';
    wrap.appendChild(msg);
  }
  msg.textContent = message;
}

function clearEmptyMessage(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = '';
  const msg = canvas.parentElement.querySelector('.chart-empty');
  if (msg) msg.remove();
}

function renderLine(canvasId, labels, datasets, options = {}) {
  if (!isAvailable()) {
    renderNoDataMessage(canvasId, 'Los gráficos requieren conexión para cargar Chart.js la primera vez.');
    return;
  }
  clearEmptyMessage(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroy(canvasId);
  const chart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: baseOptions(options),
  });
  registry.set(canvasId, chart);
}

function renderBar(canvasId, labels, datasets, options = {}) {
  if (!isAvailable()) {
    renderNoDataMessage(canvasId, 'Los gráficos requieren conexión para cargar Chart.js la primera vez.');
    return;
  }
  clearEmptyMessage(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroy(canvasId);
  const chart = new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: baseOptions(options),
  });
  registry.set(canvasId, chart);
}

export function renderBodyweightChart(canvasId, bodyMetrics, range = 'all') {
  const start = rangeStartDate(range);
  const points = bodyMetrics
    .filter((m) => new Date(m.date) >= start && m.weight !== null && m.weight !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!points.length) return renderNoDataMessage(canvasId, 'Registra tu peso corporal para ver la evolución.');
  renderLine(
    canvasId,
    points.map((p) => dateOnly(p.date)),
    [{ label: 'Peso corporal (kg)', data: points.map((p) => p.weight), borderColor: PALETTE.line, backgroundColor: PALETTE.line, tension: 0.3 }]
  );
}

export function renderLiftChart(canvasId, sessions, exerciseId, exerciseName, range = 'all') {
  const start = rangeStartDate(range);
  const points = [];
  sessions
    .filter((s) => s.status === 'completed' && new Date(s.date) >= start)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return;
      const completed = ex.sets.filter((set) => set.completed && set.weight > 0);
      if (!completed.length) return;
      const maxWeight = Math.max(...completed.map((set) => Number(set.weight)));
      points.push({ date: s.date, weight: maxWeight });
    });
  if (!points.length) return renderNoDataMessage(canvasId, `Aún no hay sesiones registradas de ${exerciseName}.`);
  renderLine(
    canvasId,
    points.map((p) => dateOnly(p.date)),
    [{ label: `${exerciseName} — carga máxima (kg)`, data: points.map((p) => p.weight), borderColor: PALETTE.line, backgroundColor: PALETTE.line, tension: 0.3 }]
  );
}

export function renderE1RMChart(canvasId, sessions, exerciseId, exerciseName, range = 'all') {
  const start = rangeStartDate(range);
  const points = [];
  sessions
    .filter((s) => s.status === 'completed' && new Date(s.date) >= start)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return;
      const best = ex.sets
        .filter((set) => set.completed && set.weight > 0 && set.reps > 0)
        .reduce((max, set) => Math.max(max, e1RM(set.weight, set.reps)), 0);
      if (best > 0) points.push({ date: s.date, value: best });
    });
  if (!points.length) return renderNoDataMessage(canvasId, `Aún no hay datos de 1RM estimado para ${exerciseName}.`);
  renderLine(
    canvasId,
    points.map((p) => dateOnly(p.date)),
    [{ label: `${exerciseName} — 1RM estimado (kg)`, data: points.map((p) => p.value), borderColor: PALETTE.line2, backgroundColor: PALETTE.line2, tension: 0.3 }]
  );
}

export function renderWeeklyVolumeChart(canvasId, sessions, weeks = 8) {
  const buckets = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const ref = new Date(now.getTime() - i * 7 * 86400000);
    const start = startOfWeek(ref).getTime();
    const end = start + 7 * 86400000;
    const vol = sessions
      .filter((s) => s.status === 'completed')
      .filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= start && t < end;
      })
      .reduce((sum, s) => sum + s.exercises.reduce((a, e) => a + e.sets.filter((set) => set.completed).reduce((b, set) => b + set.weight * set.reps, 0), 0), 0);
    buckets.push({ label: dateOnly(new Date(start).toISOString()), value: Math.round(vol) });
  }
  if (!buckets.some((b) => b.value > 0)) return renderNoDataMessage(canvasId, 'Completa sesiones para ver tu volumen semanal.');
  renderBar(canvasId, buckets.map((b) => b.label), [{ label: 'Volumen semanal (kg)', data: buckets.map((b) => b.value), backgroundColor: PALETTE.line }]);
}

export function renderComplianceChart(canvasId, sessions, weeks = 8, plannedPerWeek = PROGRAM_DAYS.length) {
  const buckets = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const ref = new Date(now.getTime() - i * 7 * 86400000);
    const start = startOfWeek(ref).getTime();
    const end = start + 7 * 86400000;
    const count = sessions.filter((s) => s.status === 'completed').filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= start && t < end;
    }).length;
    buckets.push({ label: dateOnly(new Date(start).toISOString()), pct: Math.min(100, Math.round((count / plannedPerWeek) * 100)) });
  }
  renderBar(canvasId, buckets.map((b) => b.label), [{ label: 'Cumplimiento semanal (%)', data: buckets.map((b) => b.pct), backgroundColor: PALETTE.line2 }], {
    scales: { y: { min: 0, max: 100, ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } }, x: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } } },
  });
}

export function destroyAll() {
  registry.forEach((chart) => chart.destroy());
  registry.clear();
}
