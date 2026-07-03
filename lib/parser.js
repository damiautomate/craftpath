import matter from 'gray-matter';
import yaml from 'js-yaml';

const slugify = (s) => String(s || '')
  .toLowerCase().trim()
  .replace(/[.\s]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

// ---- Parse ONE lesson markdown file (front-matter + body) into a lessons row ----
export function parseLesson(md) {
  const { data, content } = matter(md);
  if (!data.id) throw new Error('Lesson is missing an `id` in its front-matter.');
  const type = data.branch ? 'branch'
    : data.type ? data.type
    : data.shared ? 'shared'
    : data.layer === 'primer' ? 'primer'
    : 'trunk';
  return {
    code: String(data.id),
    title: data.title || String(data.id),
    layer: data.layer || null,
    type,
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

// ---- Parse a skill manifest (skill.yaml) into skill + phases + module ordering ----
// Accepts flexible shapes: `phases` | `modules_by_phase` | `journey`.
export function parseManifest(ymlText) {
  const m = yaml.load(ymlText) || {};
  const idRaw = m.skill || m.skill_id || m.id || m.title;
  const skill = {
    slug: m.slug || slugify(idRaw) + (m.title && !m.slug ? '-' + slugify(m.title) : ''),
    title: m.title || String(idRaw || 'Untitled skill'),
    tagline: m.tagline || m.summary || '',
    goal: m.goal || m.tagline || '',
  };
  const rawPhases = m.phases || m.modules_by_phase || m.journey || [];
  const phases = rawPhases.map((p, i) => ({
    number: p.phase ?? p.number ?? i,
    name: p.name || p.title || ('Phase ' + i),
    goal: p.goal || '',
    gate_text: (p.gate && p.gate.text) || p.gate || p.gate_rule || '',
    modules: (p.modules || p.lessons || []).map((mod, j) => ({
      lesson_code: String(mod.id || mod.code || mod),
      layer: mod.layer || null,
      sort: j,
    })),
  }));
  return { skill, phases };
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
