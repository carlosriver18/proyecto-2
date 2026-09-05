// Funciones auxiliares puras, sin dependencias de estado ni DOM más allá de querySelector.

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO() {
  return new Date().toISOString();
}

export function dateOnly(iso) {
  return (iso || '').slice(0, 10);
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function round(n, step = 1) {
  return Math.round(n / step) * step;
}

export function roundTo1(n) {
  return Math.round(n * 10) / 10;
}

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function weekdayLabel(date = new Date()) {
  return WEEKDAY_LABELS[date.getDay()];
}

// 0 = Lunes ... 6 = Domingo
export function isoWeekday(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDurationMs(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}min`;
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const diff = isoWeekday(d);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(a, b) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86400000);
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function kgToLb(kg) {
  return roundTo1(kg * 2.20462);
}

export function lbToKg(lb) {
  return roundTo1(lb / 2.20462);
}

export function formatWeight(kg, units = 'kg') {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—';
  if (units === 'lb') return `${roundTo1(kgToLb(kg))} lb`;
  return `${roundTo1(kg)} kg`;
}
