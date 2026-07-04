import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseLesson, parseManifest, parseGlossary } from '@/lib/parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  const p = await getProfile();
  if (!p || !p.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'No .zip file uploaded.' }, { status: 400 });

    const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
    const entries = [];
    zip.forEach((path, entry) => { if (!entry.dir) entries.push(entry); });
    const files = await Promise.all(entries.map(async (e) => ({
      base: e.name.split('/').pop(),
      content: await e.async('string'),
    })));

    const sb = createAdminClient();
    const summary = { lessons: { saved: [], errors: [] }, glossary: 0, skills: [] };

    // 1) LESSONS — every .md except README / design docs
    for (const f of files) {
      if (!/\.md$/i.test(f.base) || /^README/i.test(f.base) || /APP_DESIGN/i.test(f.base)) continue;
      try {
        const row = parseLesson(f.content);
        if (!row.code || row.code === 'undefined') throw new Error('missing front-matter id');
        const { error } = await sb.from('lessons').upsert(row, { onConflict: 'code' });
        if (error) throw new Error(error.message);
        summary.lessons.saved.push(row.code);
      } catch (e) { summary.lessons.errors.push({ name: f.base, error: e.message }); }
    }

    // 2) GLOSSARY
    const gloss = files.find((f) => /glossary\.ya?ml$/i.test(f.base));
    if (gloss) {
      const terms = parseGlossary(gloss.content);
      if (terms.length) { const { error } = await sb.from('glossary_terms').upsert(terms, { onConflict: 'term' }); if (!error) summary.glossary = terms.length; }
    }

    // 3) SKILL MANIFESTS (build the journey) — done last so lessons already exist
    for (const f of files.filter((x) => /skill\.ya?ml$/i.test(x.base))) {
      try {
        const { skill, phases } = parseManifest(f.content);
        const { data: skillRow, error } = await sb.from('skills')
          .upsert({ slug: skill.slug, title: skill.title, tagline: skill.tagline, goal: skill.goal }, { onConflict: 'slug' })
          .select().single();
        if (error) throw new Error(error.message);
        await sb.from('phases').delete().eq('skill_id', skillRow.id);
        let mods = 0;
        for (const ph of phases) {
          const { data: phaseRow, error: pErr } = await sb.from('phases')
            .insert({ skill_id: skillRow.id, number: ph.number, name: ph.name, goal: ph.goal, gate_text: ph.gate_text, sort: ph.number })
            .select().single();
          if (pErr) throw new Error(pErr.message);
          if (ph.modules.length) {
            const { error: mErr } = await sb.from('phase_modules').insert(ph.modules.map((m) => ({ phase_id: phaseRow.id, lesson_code: m.lesson_code, layer: m.layer, sort: m.sort })));
            if (mErr) throw new Error(mErr.message);
            mods += ph.modules.length;
          }
        }
        summary.skills.push({ slug: skill.slug, title: skill.title, phases: phases.length, modules: mods });
      } catch (e) { summary.skills.push({ error: e.message }); }
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
