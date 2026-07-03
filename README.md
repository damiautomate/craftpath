# Craftpath

A **content-as-data learning platform**. You upload markdown lessons through an admin interface; students learn through a guided, gated journey. The app is a *thin renderer* — adding or editing content never touches the code.

This repo is built in stages. **Stage 1 (this delivery) is the foundation:** the project scaffold, the database schema, and the content pipeline (the markdown/YAML parser + data-access layer). The admin UI and the student app follow in Stages 2 and 3.

---

## The three parts

1. **Student app** (`/learn`) — the learning experience: the journey map, the lesson reader with inline glossary popovers, progress + phase gates, and captured work (portfolio). *(Stage 3)*
2. **Admin app** (`/admin`) — where you upload/edit lessons (`.md`), the skill manifest (`.yaml`), and the glossary; publish; and preview. *(Stage 2)*
3. **Backend** — Supabase (Postgres database + auth + storage) + the parsing/data API in this app. *(Foundation — Stage 1, here.)*

## Tech stack

- **Next.js (App Router)** — one framework for the student app, admin app, and API. Deploys to **Vercel**.
- **Supabase** — Postgres database, authentication (accounts + cross-device progress), and file storage — all managed in the browser.
- **gray-matter + js-yaml** — parse uploaded markdown front-matter and YAML manifests.

---

## How content flows (the core idea)

```
You (admin) upload a .md lesson  ─▶  parser reads front-matter + body
        │                                   │
        │                                   ▼
        │                          stored in the `lessons` table
        ▼                                   │
 upload skill.yaml (manifest) ─▶ stored as skills + phases + phase_modules
        │                                   │
 upload glossary.yaml ─────────▶ stored in `glossary_terms`
                                            │
                                            ▼
                    Student app reads it via the data layer and renders it
                    (journey map, lesson reader, glossary popovers, gates)
```

Nothing is hard-coded. A new lesson, skill, or term is a content upload — **zero code changes**.

---

## Setup (once)

**Prerequisites:** Node 18+, a free [Supabase](https://supabase.com) account, and (for deploy) a free [Vercel](https://vercel.com) account.

1. **Create a Supabase project.** In the dashboard → **SQL Editor**, paste and run `supabase/schema.sql`. This creates the content store, users/progress tables, and row-level security.
2. **Get your keys.** Supabase → **Settings → API**. Copy the Project URL, the `anon` public key, and the `service_role` key.
3. **Configure env.** Copy `.env.example` to `.env.local` and fill in the three values.
4. **Install & run.**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000.
5. **Make yourself an admin.** Sign up an account in the app (once auth is wired in Stage 2/3), then in the Supabase SQL editor run:
   ```sql
   update profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```

## Loading your existing content

The markdown lessons, `skill.yaml`, and `glossary.yaml` you already have drop straight in: once the admin UI (Stage 2) is live, you upload them and they're parsed and stored. (A bulk-import script can also be added to seed everything at once.)

## Deploy

1. Push this repo to GitHub.
2. In Vercel, **Import** the repo. Add the three environment variables (same as `.env.local`).
3. Deploy. Vercel gives you a live URL. Supabase is already hosted — nothing else to run.

---

## Project structure

```
craftpath/
  app/
    layout.js            root layout (fonts, theme)
    globals.css          design tokens (bright + warm-dark) + base styles
    page.js              landing (routes to student / admin)
    learn/               student app            (Stage 3)
    admin/               admin app              (Stage 2)
  lib/
    supabase/
      client.js          browser Supabase client
      server.js          server Supabase client (session-aware)
      admin.js           service-role client (server-only, admin imports)
    parser.js            parseLesson / parseManifest / parseGlossary  ← the pipeline
    content.js           data access: journeys, lessons, glossary, progress
  supabase/
    schema.sql           the database + RLS (run once)
  middleware.js          refreshes the auth session
  .env.example
```

## Build roadmap

- **Stage 1 — Foundation (done):** scaffold, schema, content pipeline, data layer.
- **Stage 2 — Admin:** auth, upload/parse/import lessons + manifest + glossary, manage & publish, preview.
- **Stage 3 — Student app:** the full experience wired to the backend, with accounts and persistent progress/work.
- **Stage 4 — Polish & deploy:** final styling, deployment config, and a bulk content import.
- **Later:** platform branches + in-app video, the feedback loop, and AI-assisted features.

---

## Using it (after setup)

**As a student:** go to `/learn`, sign in, and the journey opens — lessons with glossary popovers, progress + gates, a streak, and a Work tab that saves your deliverables. Progress and work persist to your account (cross-device).

**As an admin:** go to `/admin` → **Import**, and upload your `.md` lessons, `skill.yaml`, and `glossary.yaml`. Manage and publish under Lessons / Skills / Glossary. Publishing a skill makes it visible to students.

### Load ALL existing content at once (bulk import)

Instead of uploading files by hand, seed everything from your content repo:

```bash
# from the craftpath-app folder, with .env.local filled in:
node scripts/import-content.mjs ../learning-platform-content
```

This imports every lesson, the glossary, and each skill manifest. Then publish the skill (admin → Skills → Publish, or `update skills set published = true;`).
