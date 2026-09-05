// Navegación (sidebar desktop + barra inferior móvil), banner de sesión pendiente
// y widget flotante del temporizador de descanso, visibles en toda la app.

import { navigate, currentPath } from '../router.js';
import * as timer from '../timer.js';
import { formatSeconds } from '../utils.js';
import { hasResumableSession, discardResumableSession } from '../workouts.js';
import { getState, subscribe } from '../state.js';
import { confirmAction } from './common.js';

const ICONS = {
  dashboard: '<path d="M4 12 12 4l8 8"/><path d="M6 10v10h12V10"/>',
  train: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4V8z"/>',
  plan: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  progress: '<path d="M4 20V10M11 20V4M18 20v-7"/>',
  prs: '<path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4z"/><path d="M6 6H3v1a4 4 0 0 0 3 3.87M18 6h3v1a4 4 0 0 1-3 3.87"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/train', label: 'Entrenamiento', icon: 'train' },
  { path: '/plan', label: 'Plan', icon: 'plan' },
  { path: '/history', label: 'Historial', icon: 'history' },
  { path: '/progress', label: 'Progreso', icon: 'progress' },
  { path: '/prs', label: 'PRs', icon: 'prs' },
  { path: '/profile', label: 'Perfil', icon: 'profile' },
];

const BOTTOM_ITEMS = [
  { path: '/dashboard', label: 'Inicio', icon: 'dashboard' },
  { path: '/train', label: 'Entrenar', icon: 'train' },
  { path: '/history', label: 'Historial', icon: 'history' },
  { path: '/progress', label: 'Progreso', icon: 'progress' },
  { path: '/more', label: 'Más', icon: 'more' },
];

function isActive(itemPath, path) {
  if (itemPath === '/more') return ['/plan', '/prs', '/profile', '/more'].includes(path);
  return itemPath === path;
}

export function renderNav() {
  const sidebar = document.getElementById('sidebar');
  const bottomNav = document.getElementById('bottom-nav');
  const path = currentPath();

  sidebar.innerHTML = `
    <div class="brand">
      <span class="brand-mark">FF</span>
      <div>
        <strong>ForgeFit</strong>
        <span class="muted small">v1.1.0</span>
      </div>
    </div>
    <nav class="sidebar-nav" aria-label="Navegación principal">
      ${SIDEBAR_ITEMS.map((item) => navLink(item, path, 'sidebar-link')).join('')}
    </nav>
  `;

  bottomNav.innerHTML = BOTTOM_ITEMS.map((item) => navLink(item, path, 'bottom-link')).join('');

  sidebar.querySelectorAll('[data-nav]').forEach((a) => a.addEventListener('click', onNavClick));
  bottomNav.querySelectorAll('[data-nav]').forEach((a) => a.addEventListener('click', onNavClick));
}

function navLink(item, currentP, cls) {
  const active = isActive(item.path, currentP);
  return `<a href="#${item.path}" data-nav="${item.path}" class="${cls}${active ? ' active' : ''}" aria-current="${active ? 'page' : 'false'}">
    ${icon(item.icon)}<span>${item.label}</span>
  </a>`;
}

function onNavClick(e) {
  e.preventDefault();
  navigate(e.currentTarget.dataset.nav);
}

export function updateNavActiveState() {
  renderNav();
}

// ---- Banner de sesión pendiente ----
export function renderResumeBanner() {
  const banner = document.getElementById('resume-banner');
  const path = currentPath();
  const resumable = hasResumableSession();
  if (!resumable || path === '/train') {
    banner.hidden = true;
    banner.innerHTML = '';
    return;
  }
  banner.hidden = false;
  banner.innerHTML = `
    <div class="resume-banner-inner">
      <span>Encontramos una sesión en progreso (${resumable.dayTitle}).</span>
      <div class="resume-actions">
        <button class="btn btn-sm btn-primary" id="resume-continue">Continuar</button>
        <button class="btn btn-sm btn-ghost" id="resume-discard">Descartar</button>
      </div>
    </div>`;
  document.getElementById('resume-continue').addEventListener('click', () => navigate('/train'));
  document.getElementById('resume-discard').addEventListener('click', () => {
    if (confirmAction('¿Descartar la sesión en progreso? No se guardará como completada.')) {
      discardResumableSession();
      renderResumeBanner();
    }
  });
}

// ---- Widget flotante de temporizador de descanso ----
export function mountRestTimerWidget() {
  const widget = document.getElementById('rest-timer-widget');
  const render = (state) => {
    if (!state.running) {
      widget.hidden = true;
      widget.innerHTML = '';
      return;
    }
    widget.hidden = false;
    widget.innerHTML = `
      <div class="timer-info">
        <span class="timer-label">${state.label ? `Descanso · ${state.label}` : 'Descanso'}</span>
        <span class="timer-count">${formatSeconds(state.remaining)}</span>
      </div>
      <div class="timer-actions">
        <button class="btn btn-sm" data-t="15">+15s</button>
        <button class="btn btn-sm" data-t="30">+30s</button>
        <button class="btn btn-sm btn-ghost" data-t="skip">Omitir</button>
      </div>`;
    widget.querySelector('[data-t="15"]').addEventListener('click', () => timer.addSeconds(15));
    widget.querySelector('[data-t="30"]').addEventListener('click', () => timer.addSeconds(30));
    widget.querySelector('[data-t="skip"]').addEventListener('click', () => timer.skip());
  };
  timer.subscribe(render);
  render(timer.getTimerState());
}

export function mountGlobalUIReactivity() {
  subscribe(() => renderResumeBanner());
}
