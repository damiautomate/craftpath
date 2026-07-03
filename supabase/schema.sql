-- ============================================================
--  CRAFTPATH — database schema for Supabase (Postgres)
--  Run this once in the Supabase SQL editor for a new project.
--  It creates the content store, users/progress, and security.
-- ============================================================

-- ---------- PROFILES (extends Supabase auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  chosen_platform text,
  created_at timestamptz not null default now()
);

-- ---------- LESSONS (the content store: every uploaded .md becomes a row) ----------
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                    -- e.g. T0.1, B2.1, F3.1, P1
  title text not null,
  layer text,                                   -- craft | business | foundation | primer
  type text not null default 'trunk',           -- trunk | shared | primer | branch
  mode text,
  est_min int,
  blurb text,
  deliverable text,
  body_md text,                                 -- the markdown body
  front_matter jsonb not null default '{}'::jsonb,
  status text not null default 'draft',          -- draft | complete | placeholder | stub
  maturity text default 'experimental',
  version text,
  glossary_terms jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- SKILLS ----------
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- e.g. 1-3-6-crm-implementation
  title text not null,
  tagline text,
  goal text,
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PHASES (per skill) ----------
create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  number int not null,
  name text not null,
  goal text,
  gate_text text,
  sort int not null default 0
);

-- ---------- PHASE MODULES (ordered lessons within a phase; references a lesson by code) ----------
create table if not exists phase_modules (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  lesson_code text not null,                    -- references lessons.code (shared lessons reused across skills)
  layer text,
  sort int not null default 0
);
create index if not exists idx_phase_modules_phase on phase_modules(phase_id);

-- ---------- GLOSSARY ----------
create table if not exists glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term text unique not null,
  definition text not null,
  primer_code text,
  see_also jsonb not null default '[]'::jsonb
);

-- ---------- PROGRESS (per user, per lesson) ----------
create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_code text not null,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_code)
);

-- ---------- DELIVERABLES (per user, per lesson — the captured work / portfolio) ----------
create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_code text not null,
  content text,
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_code)
);

-- ============================================================
--  FUNCTIONS & TRIGGERS
-- ============================================================

-- Is the current user an admin? SECURITY DEFINER bypasses RLS (avoids recursion).
create or replace function is_admin() returns boolean
  language sql security definer stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Auto-create a profile row when a user signs up.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table profiles       enable row level security;
alter table lessons        enable row level security;
alter table skills         enable row level security;
alter table phases         enable row level security;
alter table phase_modules  enable row level security;
alter table glossary_terms enable row level security;
alter table progress       enable row level security;
alter table deliverables   enable row level security;

-- Profiles: a user sees/updates their own; admins can read all.
drop policy if exists "profiles read" on profiles;
create policy "profiles read"   on profiles for select using (auth.uid() = id or is_admin());
drop policy if exists "profiles update" on profiles;
create policy "profiles update" on profiles for update using (auth.uid() = id);

-- Content (lessons, skills, phases, phase_modules, glossary): world-readable; admin-writable.
drop policy if exists "lessons read" on lessons;
create policy "lessons read"  on lessons for select using (true);
drop policy if exists "lessons write" on lessons;
create policy "lessons write" on lessons for all using (is_admin()) with check (is_admin());

drop policy if exists "skills read" on skills;
create policy "skills read"  on skills for select using (true);
drop policy if exists "skills write" on skills;
create policy "skills write" on skills for all using (is_admin()) with check (is_admin());

drop policy if exists "phases read" on phases;
create policy "phases read"  on phases for select using (true);
drop policy if exists "phases write" on phases;
create policy "phases write" on phases for all using (is_admin()) with check (is_admin());

drop policy if exists "phase_modules read" on phase_modules;
create policy "phase_modules read"  on phase_modules for select using (true);
drop policy if exists "phase_modules write" on phase_modules;
create policy "phase_modules write" on phase_modules for all using (is_admin()) with check (is_admin());

drop policy if exists "glossary read" on glossary_terms;
create policy "glossary read"  on glossary_terms for select using (true);
drop policy if exists "glossary write" on glossary_terms;
create policy "glossary write" on glossary_terms for all using (is_admin()) with check (is_admin());

-- Progress & deliverables: strictly per-user.
drop policy if exists "progress own" on progress;
create policy "progress own"     on progress     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "deliverables own" on deliverables;
create policy "deliverables own" on deliverables for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  DONE. Next: create your account via the app, then run:
--    update profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');
--  to make yourself an admin.
-- ============================================================
