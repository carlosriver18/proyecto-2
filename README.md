# ForgeFit v1.0.0

Aplicación web de entrenamiento personal enfocada en **fuerza + hipertrofia**: sesiones diarias con registro por serie, temporizador de descanso, progresión automática de cargas, detección de PRs, historial, gráficos de progreso y un programa de 8 semanas con periodización. Funciona completamente **sin backend**, instalable como **PWA** y desplegable en **GitHub Pages**.

No es una landing page: es la app que se usa a diario, en el celular o la computadora, durante el entrenamiento.

## Funcionalidades

- **Dashboard**: semana actual, entrenamiento de hoy, progreso semanal, racha, volumen, PRs recientes, estado de recuperación y últimas sesiones.
- **Entrenamiento**: registro por serie (peso, reps, RIR o RPE), carga objetivo y rendimiento anterior visibles, marcar serie completa, agregar/eliminar series, notas por ejercicio y por sesión, calentamiento separado del volumen de trabajo.
- **Temporizador de descanso**: widget flotante global (60/90/120/150/180 s configurables), +15 s, +30 s, omitir, vibración y sonido al terminar.
- **Resumen de sesión**: duración, series, repeticiones, volumen, PRs, RIR promedio y mensajes contextuales.
- **Plan de 8 semanas**: rutina de 5 días (Empuje / Pierna + pie / Tirón / Posterior + core / Full body), periodización por fases y semana de *deload* (semana 8) con reducción visual de carga y volumen.
- **Motor de progresión**: aumenta, mantiene o reduce la carga de cada ejercicio según reps, RIR y series completadas de la sesión anterior — no son incrementos fijos.
- **PRs automáticos**: mayor peso, mayor 1RM estimado (Epley), mayor volumen y mejor rendimiento de repeticiones a una carga dada.
- **Historial**: lista filtrable por fecha/ejercicio/grupo muscular, con detalle serie a serie de cada sesión.
- **Progreso**: gráficos (Chart.js) de peso corporal, progresión de carga, 1RM estimado, volumen semanal y cumplimiento semanal, con rango 7d/30d/8 semanas/todo; series semanales por grupo muscular.
- **Perfil y configuración**: datos personales, objetivo/nivel, tema oscuro/claro, unidades kg/lb, sonidos/vibración, descanso por defecto, registro corporal (peso/cintura/brazo/pecho/muslo) y check-in de recuperación (sueño/energía/fatiga/estrés) con estado calculado.
- **Backup**: exportar/importar JSON completo y exportar historial a CSV.
- **PWA**: manifest + service worker, instalable, funciona offline tras la primera carga.
- **Sesión resiliente**: si se cierra el navegador durante un entrenamiento, al volver se ofrece continuar o descartar.
- **Onboarding** de primer uso, omitible en cualquier paso.

## Arquitectura

```
/
├── index.html          # shell de la SPA (nav + contenedor de rutas)
├── styles.css           # tema oscuro/claro, responsive
├── manifest.json         # PWA
├── sw.js                # service worker (cache app shell + runtime)
├── assets/icons/         # icono de la app (SVG)
└── js/
    ├── app.js            # arranque: rutas, nav, tema, onboarding, SW
    ├── router.js          # router por hash (compatible con GitHub Pages)
    ├── state.js           # store en memoria + persistencia (pub/sub)
    ├── storage.js          # localStorage versionado, export/import, CSV
    ├── data.js            # catálogo de ejercicios, días, periodización (datos, no UI)
    ├── calculations.js      # volumen, e1RM, RIR/RPE, promedios, agregados
    ├── progression.js       # motor de progresión de cargas
    ├── prs.js             # detección automática de PRs
    ├── timer.js            # temporizador de descanso global
    ├── workouts.js          # ciclo de vida de una sesión de entrenamiento
    ├── charts.js           # envoltorio de Chart.js
    ├── utils.js            # helpers puros (fechas, formato, validación)
    ├── ai/coach.js          # capa de "AI Coach" basada en reglas (fase 1)
    └── ui/                # una función de render por pantalla + nav/common/onboarding
```

Los datos del programa (ejercicios, días, series objetivo, periodización) viven en `js/data.js`, separados de la UI. Cada pantalla es una función `render*(container)` que se registra como ruta; el estado vive en `js/state.js` y se persiste automáticamente en `localStorage` a través de `js/storage.js`.

## Cómo ejecutar localmente

Es una app estática con ES Modules, por lo que necesita servirse por HTTP (no `file://`). Cualquier servidor estático funciona, por ejemplo:

```bash
npx serve .
```

Luego abre la URL que indique (por defecto `http://localhost:3000`).

## Desplegar en GitHub Pages

1. Sube el contenido de esta carpeta a la rama `main` del repositorio.
2. En GitHub → Settings → Pages, selecciona la rama `main` y la carpeta raíz (`/`).
3. La app queda disponible en `https://<usuario>.github.io/<repo>/`.

La navegación usa rutas por **hash** (`#/dashboard`, `#/train`, ...), así que no requiere configuración especial ni rewrites en GitHub Pages.

## Almacenamiento

Todo se guarda en `localStorage` bajo la clave `forgefit_data_v1`, con un campo `version` para poder migrar el esquema en el futuro sin romper datos existentes. Si el JSON guardado está corrupto, se conserva una copia en `forgefit_data_v1_corrupt_backup` y la app arranca con datos nuevos en vez de romperse.

- **Exportar/Importar backup** (Perfil → Backup de datos): JSON completo de perfil, sesiones, PRs, mediciones y configuración.
- **Exportar CSV**: historial de series completadas, para abrir en Excel/Sheets.

## PWA / offline

`manifest.json` + `sw.js` cachean el app shell en la primera visita. Tras eso, ForgeFit abre y permite **registrar entrenamientos sin conexión** (los datos se guardan en `localStorage` igual que online). Al subir cambios importantes, sube `CACHE_VERSION` en `sw.js` para forzar la actualización de los clientes ya instalados.

## Notas de la versión 1.0

- Las series se registran siempre en **kg** internamente (incrementos y motor de progresión definidos en kg); la unidad `lb` en Configuración solo cambia cómo se muestra el peso corporal, para no introducir errores de conversión en la progresión de cargas.
- El 1RM mostrado es siempre un **estimado** (fórmula de Epley), nunca se presenta como máximo real.
- El estado de recuperación es orientativo y **no constituye un diagnóstico médico**.
- Los gráficos requieren que Chart.js cargue por CDN la primera vez; si no hay conexión en el primer uso, las secciones de gráficos muestran un mensaje en vez de fallar.

## Roadmap

**V1.0 (esta versión) — Core training app**
Dashboard, sesiones, series, RIR/RPE, temporizador, progresión, PRs, historial, gráficos, plan de 8 semanas, PWA, offline, backup.

**V1.1**
Ejercicios y rutinas personalizadas por el usuario, plantillas de sesión, más tipos de gráficos, notificaciones de recordatorio de entrenamiento.

**V2.0**
Backend (Supabase/Firebase/PostgreSQL), cuentas de usuario, múltiples dispositivos, sincronización en la nube.

**V2.5 — AI Coach**
`js/ai/coach.js` ya expone `analyzeWorkout()`, `suggestLoad()`, `analyzeRecovery()` y `generateWeeklySummary()` con reglas locales. La siguiente fase conecta un proveedor LLM (OpenAI u otro) para analizar historial completo, volumen, PRs, RIR/RPE, recuperación y adherencia, y generar recomendaciones en lenguaje natural.

**V3.0 — Adaptive Training Engine**
Planificación adaptativa y predicción de rendimiento/fatiga a partir del historial acumulado (sin diagnósticos médicos).

## Control de versión

**ForgeFit v1.0.0** — el número de versión se muestra en la sección Perfil y en el sidebar de escritorio.
