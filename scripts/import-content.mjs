/*
 * Bulk-import all content into Supabase in one command.
 *
 *   node scripts/import-content.mjs ../learning-platform-content
 *
 * Reads SUPABASE URL + SERVICE ROLE KEY from .env.local. Walks the content
 * folder and imports every lesson (.md), each skill.yaml, and glossary.yaml.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import matter from 'gray-matter';
import yaml from 'js-yaml';

// ---- load env from .env.local ----
function loadEnv() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const ROOT = process.argv[2] || '../learning-platform-content';
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[.\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

// ---- parsers (same mapping as lib/parser.js) ----
function parseLesson(md) {
  const { data, content } = matter(md);
  const type = data.branch ? 'branch' : data.type ? data.type : data.shared ? 'shared' : data.layer === 'primer' ? 'primer' : 'trunk';
  return { code: String(data.id), title: data.title || String(data.id), layer: data.layer || null, type,
    mode: data.mode || null, est_min: data.est_time_min ?? data.est_min ?? null, blurb: data.blurb || null,
    deliverable: data.deliverable || null, body_md: (content || '').trim(), front_matter: data,
    status: data.status || 'draft', maturity: data.maturity || 'experimental',
    version: data.version != null ? String(data.version) : null, glossary_terms: data.glossary_terms || [],
    updated_at: new Date().toISOString() };
}
function parseManifest(text) {
  const m = yaml.load(text) || {};
  const idRaw = m.skill || m.skill_id || m.id || m.title;
  const skill = { slug: m.slug || slugify(idRaw) + (m.title && !m.slug ? '-' + slugify(m.title) : ''), title: m.title || String(idRaw), tagline: m.tagline || m.summary || '', goal: m.goal || m.tagline || '' };
  const rawPhases = m.phases || m.modules_by_phase || m.journey || [];
  const phases = rawPhases.map((p, i) => ({ number: p.phase ?? p.number ?? i, name: p.name || p.title || ('Phase ' + i), goal: p.goal || '', gate_text: (p.gate && p.gate.text) || p.gate || p.gate_rule || '', modules: (p.modules || p.lessons || []).map((mod, j) => ({ lesson_code: String(mod.id || mod.code || mod), layer: mod.layer || null, sort: j })) }));
  return { skill, phases };
}
function parseGlossary(text) {
  const g = yaml.load(text) || {}; const src = g.terms || g.glossary || g; const out = [];
  if (Array.isArray(src)) for (const t of src) { if (t) out.push({ term: String(t.term || t.name), definition: t.definition || t.def || t.d || '', primer_code: t.primer || t.primer_code || t.p || null, see_also: t.see_also || [] }); }
  else if (src && typeof src === 'object') for (const [term, v] of Object.entries(src)) { const val = typeof v === 'string' ? { definition: v } : (v || {}); out.push({ term, definition: val.definition || val.def || val.d || '', primer_code: val.primer || val.p || null, see_also: val.see_also || [] }); }
  return out.filter((t) => t.term && t.definition);
}

// ---- walk helpers ----
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

async function run() {
  const root = path.resolve(ROOT);
  console.log('Importing from', root);
  const files = walk(root);

  // 1) lessons
  const mdFiles = files.filter((f) => f.endsWith('.md') && !/README/i.test(path.basename(f)));
  let ok = 0;
  for (const f of mdFiles) {
    try {
      const row = parseLesson(fs.readFileSync(f, 'utf8'));
      if (!row.code || row.code === 'undefined') { console.warn('  skip (no id):', path.basename(f)); continue; }
      const { error } = await sb.from('lessons').upsert(row, { onConflict: 'code' });
      if (error) throw error; ok++;
    } catch (e) { console.warn('  lesson failed:', path.basename(f), '-', e.message); }
  }
  console.log(`Lessons: ${ok}/${mdFiles.length} imported`);

  // 2) glossary
  const gloss = files.find((f) => /glossary\.ya?ml$/i.test(f));
  if (gloss) {
    const terms = parseGlossary(fs.readFileSync(gloss, 'utf8'));
    const { error } = await sb.from('glossary_terms').upsert(terms, { onConflict: 'term' });
    console.log(error ? 'Glossary failed: ' + error.message : `Glossary: ${terms.length} terms imported`);
  }

  // 3) skill manifests
  const manifests = files.filter((f) => /skill\.ya?ml$/i.test(f));
  for (const mf of manifests) {
    try {
      const { skill, phases } = parseManifest(fs.readFileSync(mf, 'utf8'));
      const { data: skillRow, error } = await sb.from('skills').upsert({ slug: skill.slug, title: skill.title, tagline: skill.tagline, goal: skill.goal }, { onConflict: 'slug' }).select().single();
      if (error) throw error;
      await sb.from('phases').delete().eq('skill_id', skillRow.id);
      let mods = 0;
      for (const ph of phases) {
        const { data: phaseRow, error: pErr } = await sb.from('phases').insert({ skill_id: skillRow.id, number: ph.number, name: ph.name, goal: ph.goal, gate_text: ph.gate_text, sort: ph.number }).select().single();
        if (pErr) throw pErr;
        if (ph.modules.length) { const { error: mErr } = await sb.from('phase_modules').insert(ph.modules.map((m) => ({ phase_id: phaseRow.id, lesson_code: m.lesson_code, layer: m.layer, sort: m.sort }))); if (mErr) throw mErr; mods += ph.modules.length; }
      }
      console.log(`Skill "${skill.title}": ${phases.length} phases, ${mods} modules`);
    } catch (e) { console.warn('  manifest failed:', mf, '-', e.message); }
  }
  console.log('Done. Remember to publish the skill in the admin (or run: update skills set published=true;).');
}
run().catch((e) => { console.error(e); process.exit(1); });
