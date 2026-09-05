// Configuración de Supabase para la sincronización en la nube (opcional).
//
// La "anon key" de Supabase está pensada para exponerse en el cliente: quien
// controla qué datos se pueden leer/escribir es Row Level Security en la base
// de datos (ver supabase/schema.sql), no el secreto de esta clave. Por eso es
// seguro dejarla en un archivo estático servido por GitHub Pages.
//
// NUNCA pongas aquí la "service_role key" de Supabase (esa sí es secreta).
//
// Para activar la sincronización:
//   1. Crea un proyecto gratuito en https://supabase.com
//   2. Ejecuta supabase/schema.sql en el SQL Editor del proyecto
//   3. Copia "Project URL" y "anon public key" desde Settings → API
//   4. Pégalos abajo y vuelve a desplegar la app
//
// Si se dejan vacíos, ForgeFit funciona exactamente igual pero solo local
// (sin la sección "Cuenta y sincronización" en Perfil).

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
