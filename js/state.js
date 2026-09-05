// Store central en memoria. Cualquier lectura de datos de la app pasa por getState(),
// y cualquier escritura por setState(). Los suscriptores (UI) se re-renderizan al cambiar.

import * as storage from './storage.js';

const { data: initialData, error: loadError } = storage.load();

let state = initialData;
const listeners = new Set();
let lastSaveError = null;

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('Error en listener de estado', err);
    }
  });
}

// updater puede ser un objeto (merge superficial) o una función (state) => state.
// `touch` marca el estado con la hora actual (usado por la sincronización en la
// nube para decidir qué copia es más reciente); se desactiva al adoptar un estado
// remoto para conservar su marca de tiempo original en vez de pisarla.
export function setState(updater, { persist = true, touch = true } = {}) {
  let next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
  if (touch) {
    next = { ...next, meta: { ...(next.meta || {}), updatedAt: new Date().toISOString() } };
  }
  state = next;
  if (persist) {
    const result = storage.save(state);
    if (!result.ok) {
      lastSaveError = result.error;
      notify();
      return { ok: false, error: result.error };
    }
    lastSaveError = null;
  }
  notify();
  return { ok: true };
}

export function getLastSaveError() {
  return lastSaveError;
}

export function getInitialLoadError() {
  return loadError;
}

export function replaceAllData(newData) {
  state = newData;
  notify();
}
