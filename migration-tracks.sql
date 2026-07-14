import matter from 'gray-matter';
import yaml from 'js-yaml';

const slugify = (s) => String(s || '')
  .toLowerCase().trim()
  .replace(/[.\s]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

// A track id can be written as `track:`, or legacy `platform:`. Normalise to a short slug.
const trackId = (v) => (v == null ? null : slugify(v));

// Pull video info from a couple of accepted shapes:
//   video_provider: youtube  +  video_id: xxxx
//   video: { provider: youtube, id: xxxx }
//   video: "https://youtu.be/xxxx"  (URL — id extracted)
function readVideo(data) {
  let provider = data.video_provider || (data.video && data.video.provider) || null;
  let id = data.video_id || (data.video && data.video.id) || null;
  const url = (typeof data.video === 'string' && data.video) || data.video_url || null;
  if (!id && url) {
    const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    if (m) { id = m[1]; provider = provider || 'youtube'; }
  }
  if (id && !provider) provider = 'youtube';
  return { video_provider: provider, video_id: id };
}

// ---- Parse ONE lesson markdown file (front-matter + body) into a lessons row ----
export function parseLesson(md) {
  const { data, content } = matter(md);
  if (!data.id) throw new Error('Lesson is missing an `id` in its front-matter.');
  const track = trackId(data.track || data.platform || null);
  const type = data.type ? data.type
    : (track || data.branch) ? 'branch'
    : data.shared ? 'shared'
    : data.layer === 'primer' ? 'primer'
    : 'trunk';
  const { video_provider, video_id } = readVideo(data);
  return {
    code: String(data.id),
    title: data.title || String(data.id),
    layer: data.layer || null,
    type,
    track,
    video_provider,
    video_id,
    mode: data.mode || null,
    est_min: data.est_time_min ?? data.est_min ?? null,
    blurb: data.blurb || null,
    deliverable: data.deliverable || null,
    body_md: (content || '').trim(),
    front_matter: data,
    status: data.status || 'draft',
    maturity: data.maturity || 'experimental',
    version: data.version != null ? String(data.version) : null,
    glossary_terms: data.glossary_terms || [],
    updated_at: new Date().toISOString(),
  };
}

// ---- Parse a skill manifest (skill.yaml) into skill + tracks + phases + module ordering ----
// Accepts flexible shapes: `phases` | `modules_by_phase` | `journey`.
export function parseManifest(ymlText) {
  const m = yaml.load(ymlText) || {};
  const idRaw = m.skill || m.skill_id || m.id || m.title;
  const skill = {
    slug: m.slug || slugify(idRaw) + (m.title && !m.slug ? '-' + slugify(m.title) : ''),
    title: m.title || String(idRaw || 'Untitled skill'),
    tagline: m.tagline || m.summary || '',
    goal: m.goal || m.tagline || '',
    track_label: m.track_label || 'platform',
    track_choice_phase: m.track_choice_phase ?? m.choice_phase ?? 1,
  };

  // Selectable tracks. Accepts a list of {id|track|platform, label, blurb}. Only the
  // tracks listed here become choosable — so a half-built track never shows up empty.
  const rawTracks = m.tracks || m.platforms || [];
  const tracks = (Array.isArray(rawTracks) ? rawTracks : [])
    .map((t, i) => {
      if (typeof t === 'string') return { track: trackId(t), label: t, blurb: '', sort: i };
      const id = trackId(t.id || t.track || t.platform);
      return id ? { track: id, label: t.label || t.name || t.platform || id, blurb: t.blurb || t.tagline || t.segment || '', sort: t.sort ?? i } : null;
    })
    .filter(Boolean);

  const rawPhases = m.phases || m.modules_by_phase || m.journey || [];
  const phases = rawPhases.map((p, i) => ({
    number: p.phase ?? p.number ?? i,
    name: p.name || p.title || ('Phase ' + i),
    goal: p.goal || '',
    gate_text: (p.gate && p.gate.text) || p.gate || p.gate_rule || '',
    modules: (p.modules || p.lessons || []).map((mod, j) => ({
      lesson_code: String(mod.id || mod.code || mod),
      layer: mod.layer || null,
      track: trackId(mod.track || mod.platform || null),
      sort: j,
    })),
  }));

  return { skill, tracks, phases };
}

// ---- Parse glossary.yaml into term rows. Accepts a list or a map. ----
export function parseGlossary(ymlText) {
  const g = yaml.load(ymlText) || {};
  const src = g.terms || g.glossary || g;
  const out = [];
  if (Array.isArray(src)) {
    for (const t of src) {
      if (!t) continue;
      out.push({
        term: String(t.term || t.name),
        definition: t.definition || t.def || t.d || '',
        primer_code: t.primer || t.primer_code || t.p || null,
        see_also: t.see_also || t.seeAlso || [],
      });
    }
  } else if (src && typeof src === 'object') {
    for (const [term, v] of Object.entries(src)) {
      const val = typeof v === 'string' ? { definition: v } : (v || {});
      out.push({
        term,
        definition: val.definition || val.def || val.d || '',
        primer_code: val.primer || val.p || null,
        see_also: val.see_also || [],
      });
    }
  }
  return out.filter((t) => t.term && t.definition);
}
