import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseManifest } from '@/lib/parser';

export async function POST(req) {
  const p = await getProfile();
  if (!p || !p.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  try {
    const { content } = await req.json();
    const { skill, phases } = parseManifest(content);
    const sb = createAdminClient();

    const { data: skillRow, error: sErr } = await sb.from('skills')
      .upsert({ slug: skill.slug, title: skill.title, tagline: skill.tagline, goal: skill.goal }, { onConflict: 'slug' })
      .select().single();
    if (sErr) throw new Error(sErr.message);

    // clean re-import: remove old phases (cascades to phase_modules)
    await sb.from('phases').delete().eq('skill_id', skillRow.id);

    let modCount = 0;
    for (const ph of phases) {
      const { data: phaseRow, error: pErr } = await sb.from('phases')
        .insert({ skill_id: skillRow.id, number: ph.number, name: ph.name, goal: ph.goal, gate_text: ph.gate_text, sort: ph.number })
        .select().single();
      if (pErr) throw new Error(pErr.message);
      if (ph.modules.length) {
        const mods = ph.modules.map((m) => ({ phase_id: phaseRow.id, lesson_code: m.lesson_code, layer: m.layer, sort: m.sort }));
        const { error: mErr } = await sb.from('phase_modules').insert(mods);
        if (mErr) throw new Error(mErr.message);
        modCount += mods.length;
      }
    }
    return NextResponse.json({ ok: true, skill: skill.slug, title: skill.title, phases: phases.length, modules: modCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
