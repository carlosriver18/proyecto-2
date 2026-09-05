// Sincronización opcional en la nube vía Supabase. Todo el estado de ForgeFit
// (perfil, sesiones, PRs, mediciones, configuración) se guarda como un único
// documento JSON por usuario, en paridad con el modelo de localStorage — así
// esta capa no obliga a rediseñar el resto de la app en tablas relacionales.
//
// Regla de conflicto: gana el documento con `updated_at` más reciente (ver
// `meta.updatedAt` en js/state.js). Es "last write wins", suficiente para un
// usuario entrenando desde un dispositivo a la vez; no hace merge por campo.

import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';
import { getState, setState, subscribe } from '../state.js';

const TABLE = 'forgefit_state';
const PUSH_DEBOUNCE_MS = 2500;

let client = null;
let currentUser = null;
let pushTimer = null;
let status = 'disabled'; // disabled | signed_out | syncing | synced | error | offline
let lastError = null;
const listeners = new Set();

function setStatus(next, errorMessage = null) {
  status = next;
  lastError = errorMessage;
  listeners.forEach((fn) => {
    try {
      fn(getStatus());
    } catch (err) {
      console.error('Error en listener de sincronización', err);
    }
  });
}

export function onStatusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStatus() {
  return { status, user: currentUser, error: lastError };
}

export function isCloudConfigured() {
  return isConfigured();
}

const SUPABASE_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function loadSupabaseScript() {
  if (typeof window.supabase !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SUPABASE_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el cliente de Supabase (sin conexión).'));
    document.head.appendChild(script);
  });
}

export async function init() {
  if (!isConfigured()) {
    setStatus('disabled');
    return;
  }

  try {
    await loadSupabaseScript();
  } catch (err) {
    setStatus('error', err.message);
    return;
  }

  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: { session } } = await client.auth.getSession();
  currentUser = session?.user || null;
  setStatus(currentUser ? 'syncing' : 'signed_out');
  if (currentUser) await pullAndMerge();

  client.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN') {
      setStatus('syncing');
      await pullAndMerge();
    } else if (event === 'SIGNED_OUT') {
      setStatus('signed_out');
    }
  });

  subscribe(() => {
    if (currentUser) scheduleDebouncedPush();
  });

  window.addEventListener('online', () => {
    if (currentUser) scheduleDebouncedPush();
  });
}

export async function signUp(email, password) {
  if (!client) throw new Error('Supabase no está configurado.');
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

export async function signIn(email, password) {
  if (!client) throw new Error('Supabase no está configurado.');
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  if (!client) return;
  await client.auth.signOut();
}

function scheduleDebouncedPush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushNow().catch((err) => setStatus('error', err.message));
  }, PUSH_DEBOUNCE_MS);
}

// Cancela cualquier subida automática pendiente. Se llama al principio de
// toda operación explícita de sincronización para evitar una carrera donde
// una subida programada por una edición anterior se cuela durante (o justo
// después de) un "Restaurar desde la nube" y deshace la restauración.
function cancelPendingPush() {
  clearTimeout(pushTimer);
  pushTimer = null;
}

export async function pushNow() {
  cancelPendingPush();
  if (!client || !currentUser) return;
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  setStatus('syncing');
  const state = getState();
  const { error } = await client.from(TABLE).upsert({
    user_id: currentUser.id,
    data: state,
    updated_at: state.meta?.updatedAt || new Date().toISOString(),
  });
  if (error) {
    setStatus('error', error.message);
    return;
  }
  setStatus('synced');
}

async function fetchRemoteRow() {
  const { data, error } = await client
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function adoptRemote(row) {
  setState(() => ({ ...row.data, meta: { updatedAt: row.updated_at } }), { touch: false });
}

async function pullAndMerge() {
  if (!client || !currentUser) return;
  cancelPendingPush();
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  let row;
  try {
    row = await fetchRemoteRow();
  } catch (err) {
    setStatus('error', err.message);
    return;
  }
  if (!row) {
    await pushNow();
    return;
  }

  const localUpdatedAt = getState().meta?.updatedAt || null;
  const remoteIsNewer = !localUpdatedAt || new Date(row.updated_at) > new Date(localUpdatedAt);

  if (remoteIsNewer) {
    adoptRemote(row);
    setStatus('synced');
  } else {
    await pushNow();
  }
}

// Fuerza traer la copia de la nube y descarta el estado local, sin comparar
// fechas. Es el "escape hatch" manual para cuando el usuario sabe que su
// copia local no es la que quiere conservar (p. ej. editó el perfil por
// error mientras estaba desconectado y luego lo sincronizó sin querer).
export async function pullNow() {
  if (!client || !currentUser) return { ok: false, error: 'No hay sesión activa.' };
  cancelPendingPush();
  if (!navigator.onLine) {
    setStatus('offline');
    return { ok: false, error: 'Sin conexión.' };
  }
  setStatus('syncing');
  let row;
  try {
    row = await fetchRemoteRow();
  } catch (err) {
    setStatus('error', err.message);
    return { ok: false, error: err.message };
  }
  if (!row) {
    setStatus('synced');
    return { ok: false, error: 'Todavía no hay ninguna copia guardada en la nube para esta cuenta.' };
  }
  adoptRemote(row);
  setStatus('synced');
  return { ok: true };
}
