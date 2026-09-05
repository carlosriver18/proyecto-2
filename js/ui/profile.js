import { getState, setState } from '../state.js';
import { REST_PRESETS } from '../data.js';
import { uid, todayISO, clamp, escapeHtml } from '../utils.js';
import { exportJSON, importJSON, sessionsToCSV, resetAll } from '../storage.js';
import { showToast, confirmAction } from './common.js';
import { applyTheme } from './theme.js';
import { analyzeRecovery } from '../ai/coach.js';
import { EXERCISES } from '../data.js';

const GOALS = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'recomposition', label: 'Recomposición' },
  { value: 'performance', label: 'Rendimiento' },
];
const LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

export function renderProfile(container) {
  const state = getState();
  const todayStr = todayISO().slice(0, 10);
  const recoveryToday = state.recovery.find((r) => r.date.slice(0, 10) === todayStr);
  const recentMetrics = [...state.bodyMetrics].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  container.innerHTML = `
    <div class="page-header"><h1>Perfil y configuración</h1></div>

    <section class="card">
      <h3>Perfil</h3>
      <form id="profile-form" class="form-grid">
        <label>Nombre<input type="text" name="name" value="${escapeHtml(state.profile.name)}" placeholder="Tu nombre"></label>
        <label>Edad<input type="number" name="age" min="10" max="100" value="${state.profile.age ?? ''}"></label>
        <label>Peso (kg)<input type="number" name="weight" min="0" step="0.1" value="${state.profile.weight ?? ''}"></label>
        <label>Altura (cm)<input type="number" name="height" min="0" step="1" value="${state.profile.height ?? ''}"></label>
        <label>Objetivo
          <select name="goal">${GOALS.map((g) => `<option value="${g.value}" ${state.profile.goal === g.value ? 'selected' : ''}>${g.label}</option>`).join('')}</select>
        </label>
        <label>Nivel
          <select name="level">${LEVELS.map((l) => `<option value="${l.value}" ${state.profile.level === l.value ? 'selected' : ''}>${l.label}</option>`).join('')}</select>
        </label>
        <button class="btn btn-primary wide" type="submit">Guardar perfil</button>
      </form>
    </section>

    <section class="card">
      <h3>Configuración</h3>
      <div class="settings-grid">
        <label>Tema
          <select id="set-theme">
            <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Oscuro</option>
            <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Claro</option>
          </select>
        </label>
        <label>Unidades
          <select id="set-units">
            <option value="kg" ${state.settings.units === 'kg' ? 'selected' : ''}>kg</option>
            <option value="lb" ${state.settings.units === 'lb' ? 'selected' : ''}>lb</option>
          </select>
        </label>
        <label>Descanso por defecto
          <select id="set-rest">${REST_PRESETS.map((r) => `<option value="${r}" ${state.settings.defaultRest === r ? 'selected' : ''}>${r}s</option>`).join('')}</select>
        </label>
        <label class="switch-row"><input type="checkbox" id="set-sounds" ${state.settings.sounds ? 'checked' : ''}> Sonidos</label>
        <label class="switch-row"><input type="checkbox" id="set-vibration" ${state.settings.vibration ? 'checked' : ''}> Vibración</label>
      </div>
      <p class="muted small">Las series de entrenamiento se registran siempre en kg internamente; kg/lb solo cambia cómo se muestra tu peso corporal.</p>
    </section>

    <section class="card">
      <h3>Registro corporal</h3>
      <form id="metrics-form" class="form-grid">
        <label>Fecha<input type="date" name="date" value="${todayStr}" required></label>
        <label>Peso (kg)<input type="number" name="weight" step="0.1" min="0" required></label>
        <label>Cintura (cm)<input type="number" name="waist" step="0.1" min="0"></label>
        <label>Brazo (cm)<input type="number" name="arm" step="0.1" min="0"></label>
        <label>Pecho (cm)<input type="number" name="chest" step="0.1" min="0"></label>
        <label>Muslo (cm)<input type="number" name="thigh" step="0.1" min="0"></label>
        <button class="btn btn-secondary wide" type="submit">Guardar medición</button>
      </form>
      ${recentMetrics.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th><th>Brazo</th><th>Pecho</th><th>Muslo</th></tr></thead>
            <tbody>${recentMetrics.map((m) => `<tr><td>${m.date.slice(0, 10)}</td><td>${m.weight ?? '—'}</td><td>${m.waist ?? '—'}</td><td>${m.arm ?? '—'}</td><td>${m.chest ?? '—'}</td><td>${m.thigh ?? '—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>` : ''}
    </section>

    <section class="card">
      <h3>Recuperación de hoy</h3>
      <form id="recovery-form" class="form-grid">
        <label>Sueño (1–5)<input type="number" name="sleep" min="1" max="5" value="${recoveryToday?.sleep ?? 3}" required></label>
        <label>Energía (1–5)<input type="number" name="energy" min="1" max="5" value="${recoveryToday?.energy ?? 3}" required></label>
        <label>Fatiga (1–5)<input type="number" name="fatigue" min="1" max="5" value="${recoveryToday?.fatigue ?? 3}" required></label>
        <label>Estrés (1–5)<input type="number" name="stress" min="1" max="5" value="${recoveryToday?.stress ?? 3}" required></label>
        <label class="wide">Notas<textarea name="notes" rows="2">${escapeHtml(recoveryToday?.notes || '')}</textarea></label>
        <button class="btn btn-secondary wide" type="submit">Guardar recuperación</button>
      </form>
      <p class="muted small" id="recovery-status"></p>
      <p class="disclaimer">Este puntaje es orientativo y no constituye un diagnóstico médico.</p>
    </section>

    <section class="card">
      <h3>Backup de datos</h3>
      <div class="backup-actions">
        <button class="btn btn-secondary" id="export-json">Descargar backup JSON</button>
        <label class="btn btn-secondary file-btn">Importar backup<input type="file" id="import-json" accept="application/json" hidden></label>
        <button class="btn btn-secondary" id="export-csv">Exportar historial CSV</button>
      </div>
    </section>

    <section class="card danger-zone">
      <h3>Zona de riesgo</h3>
      <p class="muted small">Borra todos tus datos locales (perfil, sesiones, PRs, mediciones) y reinicia la app.</p>
      <button class="btn btn-danger" id="reset-data">Reiniciar todos los datos</button>
    </section>

    <p class="muted small version-tag">ForgeFit v1.0.0</p>
  `;

  renderRecoveryStatus(container, recoveryToday);
  wireProfileForm(container, state);
  wireSettings(container, state);
  wireMetricsForm(container);
  wireRecoveryForm(container, todayStr);
  wireBackup(container);
}

function renderRecoveryStatus(container, recoveryToday) {
  const info = analyzeRecovery(recoveryToday);
  container.querySelector('#recovery-status').textContent = `${info.status} — ${info.message}`;
}

function wireProfileForm(container, state) {
  container.querySelector('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const age = fd.get('age') ? clamp(Number(fd.get('age')), 10, 100) : null;
    const weight = fd.get('weight') ? Math.max(0, Number(fd.get('weight'))) : null;
    const height = fd.get('height') ? Math.max(0, Number(fd.get('height'))) : null;
    setState((s) => ({
      ...s,
      profile: { ...s.profile, name: fd.get('name').trim(), age, weight, height, goal: fd.get('goal'), level: fd.get('level') },
    }));
    showToast('Perfil guardado.', 'success');
  });
}

function wireSettings(container, state) {
  const persistSettings = (patch) => {
    const result = setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    if (!result.ok) showToast(result.error, 'error');
  };
  container.querySelector('#set-theme').addEventListener('change', (e) => {
    persistSettings({ theme: e.target.value });
    applyTheme(e.target.value);
  });
  container.querySelector('#set-units').addEventListener('change', (e) => persistSettings({ units: e.target.value }));
  container.querySelector('#set-rest').addEventListener('change', (e) => persistSettings({ defaultRest: Number(e.target.value) }));
  container.querySelector('#set-sounds').addEventListener('change', (e) => persistSettings({ sounds: e.target.checked }));
  container.querySelector('#set-vibration').addEventListener('change', (e) => persistSettings({ vibration: e.target.checked }));
}

function wireMetricsForm(container) {
  container.querySelector('#metrics-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const weight = Number(fd.get('weight'));
    if (weight < 0) { showToast('El peso no puede ser negativo.', 'error'); return; }
    const entry = {
      id: uid('metric'),
      date: new Date(fd.get('date')).toISOString(),
      weight,
      waist: fd.get('waist') ? Number(fd.get('waist')) : null,
      arm: fd.get('arm') ? Number(fd.get('arm')) : null,
      chest: fd.get('chest') ? Number(fd.get('chest')) : null,
      thigh: fd.get('thigh') ? Number(fd.get('thigh')) : null,
    };
    setState((s) => ({
      ...s,
      bodyMetrics: [entry, ...s.bodyMetrics],
      profile: { ...s.profile, weight },
    }));
    showToast('Medición guardada.', 'success');
    renderProfile(container);
  });
}

function wireRecoveryForm(container, todayStr) {
  container.querySelector('#recovery-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entry = {
      id: uid('recovery'),
      date: new Date().toISOString(),
      sleep: clamp(Number(fd.get('sleep')), 1, 5),
      energy: clamp(Number(fd.get('energy')), 1, 5),
      fatigue: clamp(Number(fd.get('fatigue')), 1, 5),
      stress: clamp(Number(fd.get('stress')), 1, 5),
      notes: fd.get('notes') || '',
    };
    setState((s) => ({
      ...s,
      recovery: [entry, ...s.recovery.filter((r) => r.date.slice(0, 10) !== todayStr)],
    }));
    showToast('Recuperación registrada.', 'success');
    renderRecoveryStatus(container, entry);
  });
}

function wireBackup(container) {
  container.querySelector('#export-json').addEventListener('click', () => {
    downloadFile(exportJSON(getState()), `forgefit-backup-${todayISO().slice(0, 10)}.json`, 'application/json');
  });
  container.querySelector('#export-csv').addEventListener('click', () => {
    const csv = sessionsToCSV(getState().sessions, EXERCISES);
    downloadFile(csv, `forgefit-historial-${todayISO().slice(0, 10)}.csv`, 'text/csv');
  });
  container.querySelector('#import-json').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirmAction('Importar reemplazará todos tus datos actuales por los del backup. ¿Continuar?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = importJSON(reader.result);
      if (!result.ok) {
        showToast(result.error, 'error');
        return;
      }
      showToast('Backup importado correctamente.', 'success');
      setTimeout(() => window.location.reload(), 800);
    };
    reader.onerror = () => showToast('No se pudo leer el archivo seleccionado.', 'error');
    reader.readAsText(file);
  });
  container.querySelector('#reset-data').addEventListener('click', () => {
    if (confirmAction('Esto borrará TODOS tus datos locales de ForgeFit de forma permanente. ¿Seguro que quieres continuar?')) {
      resetAll();
      showToast('Datos reiniciados.', 'success');
      setTimeout(() => window.location.reload(), 600);
    }
  });
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
