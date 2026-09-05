-- ForgeFit — esquema de sincronización en la nube.
-- Ejecutar completo en el SQL Editor de tu proyecto de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).
--
-- Guarda todo el estado de la app (perfil, sesiones, PRs, mediciones,
-- configuración) como un único documento JSON por usuario autenticado.
-- Row Level Security asegura que cada usuario solo pueda leer y escribir
-- su propia fila: es lo que hace seguro exponer la "anon key" en el cliente.

create table if not exists public.forgefit_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.forgefit_state enable row level security;

drop policy if exists "Users can view their own state" on public.forgefit_state;
create policy "Users can view their own state"
  on public.forgefit_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own state" on public.forgefit_state;
create policy "Users can insert their own state"
  on public.forgefit_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own state" on public.forgefit_state;
create policy "Users can update their own state"
  on public.forgefit_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own state" on public.forgefit_state;
create policy "Users can delete their own state"
  on public.forgefit_state for delete
  using (auth.uid() = user_id);

-- Opcional pero recomendado para uso personal: en Authentication → Providers → Email,
-- puedes desactivar "Confirm email" para no depender de que Supabase te envíe un
-- correo de confirmación cada vez que crees una cuenta desde un dispositivo nuevo.
