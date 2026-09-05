// Router basado en hash: 100% compatible con GitHub Pages (no requiere rewrites de servidor).

const routes = new Map();
let defaultRoute = '/dashboard';
let container = null;
let onNavigate = null;
let routeParam = null;

export function registerRoute(path, renderFn) {
  routes.set(path, renderFn);
}

export function setDefaultRoute(path) {
  defaultRoute = path;
}

export function initRouter(rootEl, { afterNavigate } = {}) {
  container = rootEl;
  onNavigate = afterNavigate;
  window.addEventListener('hashchange', render);
  render();
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    render();
  } else {
    location.hash = path;
  }
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  return hash || defaultRoute;
}

export function getRouteParam() {
  return routeParam;
}

function render() {
  const path = currentPath();
  let renderFn = routes.get(path);
  routeParam = null;
  if (!renderFn) {
    for (const [key, fn] of routes) {
      if (path.startsWith(`${key}/`)) {
        renderFn = fn;
        routeParam = path.slice(key.length + 1);
        break;
      }
    }
  }
  if (!renderFn) renderFn = routes.get(defaultRoute);
  if (!container || !renderFn) return;
  container.innerHTML = '';
  renderFn(container);
  if (onNavigate) onNavigate(path);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
