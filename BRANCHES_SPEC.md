# Craftpath — Branches (platform execution layer)

**Status:** design approved; pilot implementation ready to deploy.
**Pilot platform:** GoHighLevel (`ghl`).
**Principle preserved:** trunk = the thinking (produces plans/designs), branch = the hands (execute the plan in a real platform). Content-as-data; the app stays a thin renderer.

---

## 1. The model (decisions locked)

- **Per-lesson companions.** A branch pairs to a single trunk lesson. When a student opens a trunk lesson that has a paired branch for the active platform, a "Now build it in {platform}" companion appears beneath the trunk content: an embedded video, a hands-on task, its own work-capture, and a "Mark built" toggle. Only the executable trunk lessons get a branch.
- **Trunk gates, branch is a companion.** Phase gates are unchanged — they still require the trunk lessons in the phase. Branches are deliberately **not** added to `phase_modules`, so they are non-gating *by omission*. A removed or private video can never wedge a gate.
- **Branch work is portfolio proof.** A branch has its own deliverable (e.g. a link/screenshot of what they built). It flows into the Work/portfolio view alongside trunk deliverables.
- **Video hosting:** YouTube embed of existing curated videos. The schema stores `video_provider` + `video_id` (not a hardcoded URL), so swapping to Cloudflare Stream / Mux later is a content change, not a rebuild. The renderer degrades to a text + "open on YouTube" link if a video is unavailable.
- **No platform picker yet.** One platform track (`ghl`) for the pilot. `page.js` defaults the platform to `ghl`; a picker is the deliberate next step when a second track's content exists.

---

## 2. Data model — zero schema migration

A branch is just a row in the existing `lessons` table:

- `type = 'branch'` — the column already lists `branch` as valid, and `parseLesson` already routes any file with a `branch:` front-matter key to it.
- Pairing + video live in `front_matter` (jsonb): `platform`, `platform_label`, `pairs_with`, `video_provider`, `video_id`.
- `progress` and `deliverables` are keyed by `lesson_code`, so a branch gets its own completion state and its own portfolio deliverable with no new tables and no RLS changes.

Import is also unchanged: the bulk `.zip` route and `import-content.mjs` already walk every `.md` recursively through `parseLesson`, so branch files import automatically.

---

## 3. Content authoring convention

Branch files live at:

```
skills/1.3.6-crm-implementation/branches/ghl/lessons/<trunkCode>-ghl.md
```

Front-matter shape (see `T2.1-ghl.md` for a full worked example):

```yaml
id: T2.1-ghl            # unique code; the code itself is just a key
branch: true            # <- this is what makes it a branch
platform: ghl
platform_label: GoHighLevel
pairs_with: T2.1        # the trunk lesson this executes
title: Build your configuration in GoHighLevel
video_provider: youtube
video_id: 9rHStsWE1so   # curated existing video; swap freely
deliverable: A link or screenshot of your built pipeline…
status: complete
```

The body is the framing: what to watch for in the video, how it maps to the plan the student already produced, the hands-on task, and common pitfalls. Keep student-facing prose free of internal vocabulary (no "trunk"/"branch"/module codes) — refer to "the plan you just made," not "the trunk lesson."

**Which trunk lessons get a branch:** the executable ones (Phase 1–2 build lessons are the obvious first set: data modelling, configuration, automation, migration, reporting, testing/go-live). Pure-concept lessons (e.g. "what a CRM is") do not.

---

## 4. Code changes (this pilot)

Four files change; one content file is added. No schema change, no new env vars.

| File | Change |
| --- | --- |
| `lib/content.js` | **Add** `getBranches(sb, platform)` — loads branch rows for a platform, keyed by the trunk code each pairs with (reads video/pairing out of `front_matter`). |
| `app/learn/[slug]/page.js` | Fetch branches (`platform = skill.branch_platform \|\| 'ghl'`) and pass `branches` to `StudentApp`. |
| `app/learn/[slug]/StudentApp.js` | Accept `branches`; build a `pairs_with → branch` map; render the new `BranchCompanion` under the trunk lesson (its own complete + work handlers, reusing `setProgress`/`saveDeliverable` by branch code); include branch work in the Work view (a branch card opens its paired trunk lesson). |
| `app/globals.css` | Append the branch styles block (`--branch` token pair, `.lp-branch*`, responsive `.cp-video` embed, `.lp-btn.branch`, `.lp-tag.branch`). |
| `…/branches/ghl/lessons/T2.1-ghl.md` | **New** — the first branch, paired to T2.1 (configuration). |

The companion renders **after** the trunk "Mark lesson complete" button: understand → produce the plan → mark the concept done → then go build it. The trunk lesson stays a cohesive unit; execution follows.

---

## 5. Deploy (browser-only)

1. **Code (GitHub web editor — pencil per file; do not drag-drop, per the known upload gotcha):**
   - Replace the contents of `lib/content.js`, `app/learn/[slug]/page.js`, and `app/learn/[slug]/StudentApp.js` with the new versions.
   - Open `app/globals.css` and paste the additions block at the very end.
   - Commit each. Vercel redeploys automatically.
2. **Content:** either import the single `T2.1-ghl.md` via `/admin → Import → individual lesson`, **or** drop the `branches/` folder into the content bundle and re-run the one-drop `.zip` import.
3. **Verify:** open the CRM skill, go to the T2.1 lesson. The indigo "Now build it in GoHighLevel" companion should appear under it, video embedded. Mark it built and capture a note — it should show in **Work** with a GoHighLevel tag, and it should **not** change any phase-gate count.

Swap `video_id: 9rHStsWE1so` for your final curated pick whenever you like — it's a one-field content edit.

---

## 6. Next (after the pilot proves out)

- Author the rest of the GoHighLevel branch set across the executable trunk lessons.
- When a second platform's content exists: add `branch_platform` to the skill manifest + a small platform switcher (the fetch is already platform-parameterized).
- Optional: an availability check on video IDs to flag dead embeds for content health.
