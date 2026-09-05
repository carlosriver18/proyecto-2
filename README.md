# ForgeFit v1.1.0

Aplicación web de entrenamiento personal enfocada en **fuerza + hipertrofia**: sesiones diarias con registro por serie, temporizador de descanso, progresión automática de cargas, detección de PRs, historial, gráficos de progreso y un programa de 8 semanas con periodización. Funciona completamente **sin backend** por defecto, con **sincronización en la nube opcional** (Supabase), instalable como **PWA** y desplegable en **GitHub Pages**.

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
- **Sincronización en la nube (opcional)**: cuenta con correo/contraseña vía Supabase, respalda todo tu estado y lo recupera desde otro dispositivo. Sin configurar, la app funciona igual pero 100% local.
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
├── supabase/schema.sql    # esquema + Row Level Security para la sincronización opcional
└── js/
    ├── app.js            # arranque: rutas, nav, tema, onboarding, SW, sync
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
    ├── sync/config.js       # credenciales públicas de Supabase (vacías por defecto)
    ├── sync/cloud.js        # auth + push/pull del estado completo a Supabase
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

## Sincronización en la nube (opcional)

Por defecto ForgeFit es 100% local (ver "Almacenamiento" arriba). Si quieres poder entrenar desde el celular y ver el progreso en la computadora, puedes activar una sincronización opcional con [Supabase](https://supabase.com) (tiene plan gratuito):

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** del proyecto y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql). Esto crea la tabla `forgefit_state` con Row Level Security, de forma que cada usuario solo puede leer/escribir su propia fila.
3. En **Settings → API**, copia el **Project URL** y la **anon public key**.
4. Pégalos en [`js/sync/config.js`](js/sync/config.js):
   ```js
   export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   export const SUPABASE_ANON_KEY = 'tu-anon-key';
   ```
5. Vuelve a desplegar (commit + push). En Perfil aparecerá la sección "Cuenta y sincronización en la nube" para crear tu cuenta.
6. Opcional: en **Authentication → Providers → Email**, desactiva "Confirm email" para no depender de un correo de confirmación cada vez que uses un dispositivo nuevo.

**Cómo funciona:** todo el estado de la app (perfil, sesiones, PRs, mediciones, configuración) se guarda como un único documento JSON por usuario — el mismo objeto que ya vive en `localStorage`. Al iniciar sesión, ForgeFit compara la fecha de última modificación local (`meta.updatedAt`) contra la de la nube y adopta la más reciente ("last write wins"); no hace merge campo por campo. Los cambios se suben automáticamente unos segundos después de cada acción (registrar una serie, guardar el perfil, etc.); si no hay conexión, se reintenta al reconectar.

**Importante:** la "anon key" de Supabase está diseñada para exponerse en código cliente — no es un secreto — porque el control de acceso real lo hace Row Level Security en la base de datos, no esa clave. Nunca uses aquí la "service_role key".

Sin configurar `js/sync/config.js`, la app funciona exactamente igual que antes: totalmente local, sin ninguna llamada de red adicional.

## Notas de la versión

- Las series se registran siempre en **kg** internamente (incrementos y motor de progresión definidos en kg); la unidad `lb` en Configuración solo cambia cómo se muestra el peso corporal, para no introducir errores de conversión en la progresión de cargas.
- El 1RM mostrado es siempre un **estimado** (fórmula de Epley), nunca se presenta como máximo real.
- El estado de recuperación es orientativo y **no constituye un diagnóstico médico**.
- Los gráficos requieren que Chart.js cargue por CDN la primera vez; si no hay conexión en el primer uso, las secciones de gráficos muestran un mensaje en vez de fallar.

## Roadmap

**V1.0 — Core training app**
Dashboard, sesiones, series, RIR/RPE, temporizador, progresión, PRs, historial, gráficos, plan de 8 semanas, PWA, offline, backup.

**V1.1 (esta versión) — Sincronización opcional**
Cuenta con correo/contraseña y respaldo en la nube vía Supabase (`js/sync/`), con `localStorage` como fuente de verdad local y la nube como copia sincronizada last-write-wins.

**V1.2**
Ejercicios y rutinas personalizadas por el usuario, plantillas de sesión, más tipos de gráficos, notificaciones de recordatorio de entrenamiento.

**V2.0**
Merge más fino entre dispositivos (en vez de last-write-wins), login social (Google), tablas relacionales si el modelo de "un documento por usuario" se queda corto.

**V2.5 — AI Coach**
`js/ai/coach.js` ya expone `analyzeWorkout()`, `suggestLoad()`, `analyzeRecovery()` y `generateWeeklySummary()` con reglas locales. La siguiente fase conecta un proveedor LLM (OpenAI u otro) para analizar historial completo, volumen, PRs, RIR/RPE, recuperación y adherencia, y generar recomendaciones en lenguaje natural.

**V3.0 — Adaptive Training Engine**
Planificación adaptativa y predicción de rendimiento/fatiga a partir del historial acumulado (sin diagnósticos médicos).

## Control de versión

**ForgeFit v1.1.0** — el número de versión se muestra en la sección Perfil y en el sidebar de escritorio.
