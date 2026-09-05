// Temporizador de descanso global. Sigue activo mientras el usuario navega dentro
// de la sesión de entrenamiento (el widget flotante lo renderiza ui/nav.js).

const SESSION_KEY = 'forgefit_rest_timer_v1';

const target = new EventTarget();
let state = {
  running: false,
  duration: 90,
  remaining: 90,
  label: '',
};
let intervalId = null;

function restore() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved.running) return;
    const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
    const remaining = saved.remaining - elapsed;
    if (remaining > 0) {
      state = { ...saved, remaining };
      delete state.savedAt;
      start(state.remaining, state.label, { resume: true });
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function persist() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    /* almacenamiento no disponible, se ignora */
  }
}

function clearPersisted() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
}

function emit() {
  target.dispatchEvent(new CustomEvent('tick', { detail: { ...state } }));
}

export function subscribe(fn) {
  const handler = (e) => fn(e.detail);
  target.addEventListener('tick', handler);
  return () => target.removeEventListener('tick', handler);
}

export function getTimerState() {
  return { ...state };
}

export function start(duration, label = '', opts = {}) {
  clearInterval(intervalId);
  state = { running: true, duration, remaining: duration, label };
  persist();
  emit();
  intervalId = setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      finish();
    } else {
      persist();
      emit();
    }
  }, 1000);
}

export function addSeconds(n) {
  if (!state.running) return;
  state.remaining = Math.max(0, state.remaining + n);
  state.duration = Math.max(state.duration, state.remaining);
  persist();
  emit();
}

export function skip() {
  finish(true);
}

export function stop() {
  clearInterval(intervalId);
  intervalId = null;
  state = { running: false, duration: state.duration, remaining: 0, label: '' };
  clearPersisted();
  emit();
}

function finish(skipped = false) {
  clearInterval(intervalId);
  intervalId = null;
  const finishedLabel = state.label;
  state = { running: false, duration: state.duration, remaining: 0, label: '' };
  clearPersisted();
  emit();
  target.dispatchEvent(new CustomEvent('complete', { detail: { skipped, label: finishedLabel } }));
}

export function onComplete(fn) {
  const handler = (e) => fn(e.detail);
  target.addEventListener('complete', handler);
  return () => target.removeEventListener('complete', handler);
}

export function notifyRestDone(settings = {}) {
  if (settings.vibration && navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch { /* no soportado */ }
  }
  if (settings.sounds) {
    playBeep();
  }
}

let audioCtx = null;
function playBeep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.55);
  } catch {
    /* audio no disponible, ignorar silenciosamente */
  }
}

restore();
