// Service Worker de ForgeFit. Cachea el app shell para que la aplicación abra
// y permita registrar entrenamientos sin conexión. Sube CACHE_VERSION al publicar
// cambios importantes para forzar la actualización de los clientes.

const CACHE_VERSION = 'forgefit-v3';
const SCOPE_URL = new URL('./', self.registration.scope);

const APP_SHELL = [
  'index.html',
  'styles.css',
  'manifest.json',
  'js/app.js',
  'js/state.js',
  'js/storage.js',
  'js/data.js',
  'js/calculations.js',
  'js/progression.js',
  'js/prs.js',
  'js/timer.js',
  'js/workouts.js',
  'js/charts.js',
  'js/router.js',
  'js/utils.js',
  'js/ai/coach.js',
  'js/sync/config.js',
  'js/sync/cloud.js',
  'js/ui/common.js',
  'js/ui/nav.js',
  'js/ui/onboarding.js',
  'js/ui/dashboard.js',
  'js/ui/training.js',
  'js/ui/plan.js',
  'js/ui/history.js',
  'js/ui/progress.js',
  'js/ui/prs.js',
  'js/ui/profile.js',
  'js/ui/more.js',
  'js/ui/theme.js',
  'assets/icons/icon.svg',
].map((path) => new URL(path, SCOPE_URL).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(new URL('index.html', SCOPE_URL).toString())))
    );
    return;
  }

  if (isSameOrigin) {
    // Stale-while-revalidate: sirve el JS/CSS cacheado al instante (para que
    // la app abra rápido y funcione offline), pero SIEMPRE pide la versión
    // fresca en paralelo y la guarda para la próxima carga. Así un despliegue
    // nuevo se auto-corrige en la recarga siguiente, sin depender de que
    // alguien recuerde subir CACHE_VERSION en cada cambio.
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Recursos externos (p. ej. Chart.js por CDN): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
