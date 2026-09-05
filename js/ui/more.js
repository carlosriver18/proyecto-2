import { navigate } from '../router.js';

const LINKS = [
  { path: '/plan', label: 'Plan de 8 semanas', desc: 'Periodización, días y cargas objetivo.' },
  { path: '/prs', label: 'PRs', desc: 'Tus récords personales.' },
  { path: '/profile', label: 'Perfil y configuración', desc: 'Datos personales, unidades, backup y recuperación.' },
];

export function renderMore(container) {
  container.innerHTML = `
    <div class="page-header"><h1>Más</h1></div>
    <div class="more-list">
      ${LINKS.map((l) => `
        <button class="card more-row" data-path="${l.path}">
          <div><strong>${l.label}</strong><span class="muted small">${l.desc}</span></div>
          <span>›</span>
        </button>`).join('')}
    </div>
  `;
  container.querySelectorAll('[data-path]').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.path)));
}
