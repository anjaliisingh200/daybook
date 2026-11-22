-- Daybook schema. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Each row keeps one app object as JSON in `data`. Row-level security makes sure
-- every user can only read and change their own rows.

create table if not exists public.task_lists (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);

create table if not exists public.calendars (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);

create table if not exists public.events (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (user_id, id)
);

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;
alter table public.calendars enable row level security;
alter table public.events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['task_lists', 'tasks', 'calendars', 'events'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Google connection: one row per user. `refresh_token` is stored ENCRYPTED by the server
-- (AES-256-GCM, key GOOGLE_TOKEN_KEY), so reading the row does not reveal the token.
create table if not exists public.google_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text,
  refresh_token text not null,
  scope text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;
drop policy if exists "own connection" on public.google_connections;
create policy "own connection" on public.google_connections for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.google_connections to authenticated;

-- Let signed-in users reach the tables through the API. New Supabase projects do not do this
-- automatically for tables made in the SQL editor. Row-level security above still limits
-- every user to their own rows, and signed-out visitors get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.task_lists, public.tasks, public.calendars, public.events to authenticated;
