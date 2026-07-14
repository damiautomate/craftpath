-- ============================================================
--  CRAFTPATH — migration: specialization TRACKS + first-class VIDEO
--  Run ONCE in the Supabase SQL editor on your existing project.
--  Safe / idempotent: add-column-if-not-exists, create-if-not-exists,
--  policies dropped-then-created. Running it twice does no harm.
-- ============================================================

-- ---- LESSONS: any lesson can carry a video; a lesson can belong to a track ----
alter table lessons add column if not exists track          text;   -- null = neutral (everyone); else e.g. 'ghl','zoho'
alter table lessons add column if not exists video_provider text;   -- 'youtube' | null (extensible later)
alter table lessons add column if not exists video_id       text;   -- e.g. '9rHStsWE1so'

-- ---- PHASE MODULES: a journey stop is neutral (null) or belongs to a track ----
alter table phase_modules add column if not exists track text;      -- null = everyone; else that track only

-- ---- SKILLS: vocabulary for the track dimension + where choice becomes required ----
alter table skills add column if not exists track_label        text default 'platform'; -- what we call a track to students
alter table skills add column if not exists track_choice_phase int  default 1;          -- first phase that requires a choice

-- ---- SKILL_TRACKS: the selectable tracks for a skill (declared in content, discovered at runtime) ----
create table if not exists skill_tracks (
  id       uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  track    text not null,                 -- 'ghl'
  label    text not null,                 -- 'GoHighLevel'
  blurb    text,
  sort     int not null default 0,
  unique(skill_id, track)
);
create index if not exists idx_skill_tracks_skill on skill_tracks(skill_id);

-- ---- ENROLLMENTS: per (user, skill) chosen track. Progress stays per-lesson and is never wiped on switch. ----
create table if not exists enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  skill_id   uuid not null references skills(id) on delete cascade,
  track      text,
  updated_at timestamptz not null default now(),
  unique(user_id, skill_id)
);
create index if not exists idx_enrollments_user on enrollments(user_id);

-- ---- RLS ----
alter table skill_tracks enable row level security;
alter table enrollments  enable row level security;

-- skill_tracks: world-readable content; admin-writable (same posture as other content tables)
drop policy if exists "skill_tracks read"  on skill_tracks;
create policy "skill_tracks read"  on skill_tracks for select using (true);
drop policy if exists "skill_tracks write" on skill_tracks;
create policy "skill_tracks write" on skill_tracks for all using (is_admin()) with check (is_admin());

-- enrollments: strictly per-user
drop policy if exists "enrollments own" on enrollments;
create policy "enrollments own" on enrollments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  DONE. After running this, re-import your content (skill.yaml now
--  declares tracks + per-module track, and lessons can carry video).
-- ============================================================
