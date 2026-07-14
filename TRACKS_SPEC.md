# Craftpath — Specialization Tracks + First-Class Video

**What changed and why.** The earlier "branch companion" was too small: video lived in a hidden card under one lesson, and platforms were bolted on. This replaces that with a proper **specialization engine**. Everyone shares a neutral spine (the thinking). At the Phase 0→1 boundary each student **chooses a platform** and, from then on, their journey is *sliced* to include that platform's hands-on, **video-first** lessons woven inline. Video is now a first-class property of *any* lesson. The whole thing is general (a "track" is not CRM-specific) and content-driven (adding a platform is a content change, never code).

---

## Model

- **Track** = the specialization dimension (a platform: `ghl`, `zoho`, …). A lesson is either **neutral** (no track — everyone sees it, text-led, optional support video) or **track-specific** (belongs to a platform, video-first).
- **Woven journey.** A phase's visible stops = its neutral modules + the student's chosen-track modules, in authored order. So a GoHighLevel student sees `T2.1 (concept) → Build it in GoHighLevel (video) → T2.2`; a Zoho student sees the Zoho one in the same slot. One content model; each student sees their own slice.
- **Choice is a gate.** Phase 0 is neutral (no choice). From `track_choice_phase` (default 1) onward, a platform is required — the app prompts the choice and locks those phases until made. You can't slide into Phase 1 seeing only neutral stops and think you're done.
- **Switching is non-destructive.** Choice is stored per *(student, skill)*. Progress is per-lesson, so switching platform just re-slices the journey — old work is kept and reappears if they switch back. The portfolio spans every track they've touched.
- **Video is first-class.** Any lesson can carry `video_provider` + `video_id`. Neutral lessons render it as *support* (after the text). Platform lessons render it *primary* (video leads, text is task + reference). Removed/private videos degrade to a text + "open on YouTube" link.

---

## Data model (see `migration-tracks.sql`)

- `lessons`: **+`track`**, **+`video_provider`**, **+`video_id`**.
- `phase_modules`: **+`track`** (null = everyone; else that track only) — this is what slices the journey.
- `skills`: **+`track_label`** (what a track is called to students, e.g. "platform"), **+`track_choice_phase`**.
- **`skill_tracks`** (new): the *selectable* platforms for a skill — declared in the manifest, so only ready platforms appear. World-readable.
- **`enrollments`** (new): per `(user, skill)` chosen track. Per-user RLS. Switching updates this row; progress is untouched.

No existing table was dropped; the migration is additive and idempotent.

---

## Content authoring

**Manifest (`skill.yaml`)** gained three things:

```yaml
track_label: "platform"
track_choice_phase: 1
tracks:
  - {id: "ghl", label: "GoHighLevel", blurb: "…"}
  # add zoho/hubspot here when their lessons exist
```

…and any phase module can be marked platform-specific by adding `track:` — placed in the order you want it to appear relative to the neutral concept it executes:

```yaml
- {id: "T2.1", title: "Configuration vs customization", layer: craft, ...}
- {id: "T2.1-ghl", title: "Build your configuration in GoHighLevel", layer: craft, track: ghl, mode: build, file: "branches/ghl/lessons/T2.1-ghl.md"}
```

**A platform lesson file** just declares its track + video:

```yaml
id: T2.1-ghl
track: ghl
title: Build your configuration in GoHighLevel
video_provider: youtube
video_id: 9rHStsWE1so
deliverable: …
```

**To add a video to ANY lesson (including neutral thinking lessons):** add `video_id: <id>` to its front-matter (provider defaults to YouTube; a full `https://youtu.be/…` URL works too) and re-import that lesson. Neutral lessons show it as a supporting "Watch it in action" block; the text stays the lead.

**To add a new platform (e.g. Zoho):** one line in `tracks:`, then author its `{track: zoho}` lessons and add them to the phases. No app change, no picker change.

---

## The code (files in this package)

| File | Change |
| --- | --- |
| `supabase/migration-tracks.sql` | **Run once** on the live DB. Adds the columns + `skill_tracks` + `enrollments` + RLS. |
| `supabase/schema.sql` | Canonical schema updated to match (for fresh installs). |
| `lib/parser.js` | Lessons parse `track` + `video`; manifest parses `tracks`, `track_label`, `track_choice_phase`, and per-module `track`. |
| `lib/content.js` | `getSkillJourney(slug, track)` slices to neutral + track; adds `getSkill`, `getSkillTracks`, `getEnrollment`, `setEnrollment`, `getUserWorkMeta`. |
| `app/learn/[slug]/page.js` | Resolves the student's enrollment track, slices the journey to it, passes tracks + work meta. |
| `app/learn/[slug]/StudentApp.js` | Track-sliced journey, the platform **picker** + choice gate, first-class **video** in the reader (primary/support), cross-track portfolio, non-destructive **switch**. |
| `app/globals.css` | Track/video/picker styles (`--track` token, `.cp-video`, `.lp-video`, `.lp-choice`, `.lp-picker-*`, etc.). |
| `app/api/admin/import/manifest/route.js` · `…/bulk/route.js` | Persist `skill_tracks`, skill track fields, and per-module `track`. |

---

## Deploy order (matters)

1. **Database first.** Supabase → SQL editor → run `migration-tracks.sql`. (The new code and the import both write the new columns; they must exist first.)
2. **Code.** Commit the code files to `damiautomate/craftpath` (GitHub web editor / pencil per file — and check the commit diff shows every existing file as *modified*, since drag-drop can skip nested files). Vercel redeploys.
3. **Content.** `/admin → Import → Upload everything (.zip)` with `craftpath-tracks-content.zip` (updated `skill.yaml` + the GHL lesson). This re-links the journey with tracks and adds the lesson. (Re-importing only the manifest + new lesson leaves your other lessons untouched.)
4. **Verify.** Phase 0 is neutral. Finishing Phase 0 prompts **Choose your platform → GoHighLevel**. Phase 2 then shows `Configuration vs customization` immediately followed by `Build your configuration in GoHighLevel` (video plays inline, primary). Add a `video_id` to any neutral lesson to see a support video. Capture work → it shows in **Work**. In **You**, switch platform — progress is kept.

---

## Next

- Author the rest of the GoHighLevel lessons across the executable phases; add Zoho/HubSpot tracks the same way.
- Optional: expose `video_id`/`track` as fields in the admin lesson editor (right now they're set via front-matter + re-import).
- Optional: a dead-video check for content health.
