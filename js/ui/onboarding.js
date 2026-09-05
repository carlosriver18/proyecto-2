// Experiencia de primer uso: 5 pasos rápidos, siempre con opción de omitir.

import { getState, setState } from '../state.js';
import { openModal, closeModal } from './common.js';
import { navigate } from '../router.js';

const STEPS = [
  { title: 'Bienvenido a ForgeFit', body: 'Tu app de entrenamiento para fuerza + hipertrofia: sesiones, progresión de cargas, PRs y recuperación en un solo lugar.' },
  { title: 'Configura tu perfil', body: 'En Perfil puedes guardar tu nombre, peso, altura, nivel y objetivo. Todo se guarda en este dispositivo.' },
  { title: 'Configura tus objetivos', body: 'Elige entre fuerza, hipertrofia, recomposición o rendimiento para orientar tus sesiones.' },
  { title: 'Revisa tu semana', body: 'El Dashboard te muestra el entrenamiento de hoy, tu progreso semanal y tus estadísticas clave.' },
  { title: 'Comienza tu entrenamiento', body: 'Desde Entrenamiento registras cada serie con peso, reps y RIR en segundos, con temporizador de descanso incluido.' },
];

export function maybeShowOnboarding() {
  const state = getState();
  if (state.profile.onboarded) return;
  showOnboarding();
}

function finish(goToProfile) {
  setState((s) => ({ ...s, profile: { ...s.profile, onboarded: true } }));
  closeModal();
  if (goToProfile) navigate('/profile');
}

function showOnboarding(stepIndex = 0) {
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  openModal(
    `
    <div class="onboarding">
      <p class="eyebrow">PASO ${stepIndex + 1} / ${STEPS.length}</p>
      <h2>${step.title}</h2>
      <p class="muted">${step.body}</p>
      <div class="onboarding-dots">
        ${STEPS.map((_, i) => `<span class="dot${i === stepIndex ? ' active' : ''}"></span>`).join('')}
      </div>
      <div class="onboarding-actions">
        <button class="btn btn-ghost" id="ob-skip">Omitir</button>
        <button class="btn btn-primary" id="ob-next">${isLast ? 'Ir a mi perfil' : 'Siguiente'}</button>
      </div>
    </div>`,
    {
      onMount: (root) => {
        root.querySelector('#ob-skip').addEventListener('click', () => finish(false));
        root.querySelector('#ob-next').addEventListener('click', () => {
          if (isLast) finish(true);
          else showOnboarding(stepIndex + 1);
        });
      },
    }
  );
}
