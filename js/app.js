import { getState, getInitialLoadError, subscribe } from './state.js';
import { initRouter, registerRoute, setDefaultRoute } from './router.js';
import { mountCommonUI, showToast } from './ui/common.js';
import { renderNav, renderResumeBanner, mountRestTimerWidget, mountGlobalUIReactivity } from './ui/nav.js';
import { applyTheme } from './ui/theme.js';
import { maybeShowOnboarding } from './ui/onboarding.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderTraining } from './ui/training.js';
import { renderPlan } from './ui/plan.js';
import { renderHistory } from './ui/history.js';
import { renderProgress } from './ui/progress.js';
import { renderPRs } from './ui/prs.js';
import { renderProfile } from './ui/profile.js';
import { renderMore } from './ui/more.js';
import * as timer from './timer.js';
import * as cloud from './sync/cloud.js';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI).href;
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* Sin service worker la app sigue funcionando online */
    });
  });
}

function wireRestTimerNotifications() {
  timer.onComplete(() => {
    const { settings } = getState();
    timer.notifyRestDone(settings);
    showToast('Descanso terminado. ¡A por la siguiente serie!', 'info');
  });
}

function init() {
  mountCommonUI();
  applyTheme(getState().settings.theme);

  const loadError = getInitialLoadError();
  if (loadError) showToast(loadError, 'error', 6000);

  setDefaultRoute('/dashboard');
  registerRoute('/dashboard', renderDashboard);
  registerRoute('/train', renderTraining);
  registerRoute('/plan', renderPlan);
  registerRoute('/history', renderHistory);
  registerRoute('/progress', renderProgress);
  registerRoute('/prs', renderPRs);
  registerRoute('/profile', renderProfile);
  registerRoute('/more', renderMore);

  renderNav();
  mountRestTimerWidget();
  mountGlobalUIReactivity();
  wireRestTimerNotifications();

  const appContent = document.getElementById('app-content');
  initRouter(appContent, {
    afterNavigate: () => {
      renderNav();
      renderResumeBanner();
    },
  });

  subscribe(() => {
    // Mantiene sincronizados peso corporal / tema en vivo si cambian desde otra pestaña.
    applyTheme(getState().settings.theme);
  });

  registerServiceWorker();
  maybeShowOnboarding();

  if (cloud.isCloudConfigured()) {
    cloud.init().catch((err) => console.error('Error iniciando sincronización en la nube', err));
  }
}

document.addEventListener('DOMContentLoaded', init);
