// Read-side data access. Pass in a Supabase client (server or browser).

export async function getPublishedSkills(sb) {
  const { data } = await sb.from('skills').select('*').eq('published', true).order('sort');
  return data || [];
}

export async function getAllSkills(sb) {
  const { data } = await sb.from('skills').select('*').order('sort');
  return data || [];
}

// Assemble a full journey: skill -> ordered phases -> ordered modules (merged with lesson meta).
export async function getSkillJourney(sb, slug) {
  const { data: skill } = await sb.from('skills').select('*').eq('slug', slug).single();
  if (!skill) return null;

  const { data: phases = [] } = await sb.from('phases').select('*').eq('skill_id', skill.id).order('sort');
  const phaseIds = phases.map((p) => p.id);
  const { data: pmods = [] } = phaseIds.length
    ? await sb.from('phase_modules').select('*').in('phase_id', phaseIds).order('sort')
    : { data: [] };

  const codes = [...new Set(pmods.map((pm) => pm.lesson_code))];
  const { data: lessons = [] } = codes.length
    ? await sb.from('lessons').select('code,title,layer,type,mode,est_min,blurb,deliverable,status').in('code', codes)
    : { data: [] };
  const lessonMap = Object.fromEntries((lessons || []).map((l) => [l.code, l]));

  const phasesOut = (phases || []).map((p) => ({
    id: p.id, number: p.number, name: p.name, goal: p.goal, gate_text: p.gate_text,
    modules: (pmods || [])
      .filter((pm) => pm.phase_id === p.id)
      .map((pm) => {
        const l = lessonMap[pm.lesson_code];
        return l
          ? { code: pm.lesson_code, layer: pm.layer || l.layer, title: l.title, mode: l.mode, est_min: l.est_min, blurb: l.blurb, deliverable: l.deliverable, status: l.status }
          : { code: pm.lesson_code, layer: pm.layer, title: pm.lesson_code, missing: true };
      }),
  }));

  return { skill, phases: phasesOut };
}

// ---- Branches: platform-specific execution companions paired to trunk lessons ----
// A branch is a lesson row with type='branch'. Its pairing + video live in front_matter.
// Passing a platform filters to that track (e.g. 'ghl'); omit it to load every branch.
export async function getBranches(sb, platform) {
  let q = sb
    .from('lessons')
    .select('code,title,mode,est_min,deliverable,body_md,front_matter,status')
    .eq('type', 'branch');
  if (platform) q = q.eq('front_matter->>platform', platform);
  const { data = [] } = await q;
  return (data || []).map((b) => {
    const fm = b.front_matter || {};
    return {
      code: b.code,
      title: b.title,
      mode: b.mode,
      est_min: b.est_min,
      deliverable: b.deliverable,
      body_md: b.body_md,
      status: b.status,
      pairs_with: fm.pairs_with || null,
      platform: fm.platform || null,
      platform_label: fm.platform_label || fm.platform || null,
      video_provider: fm.video_provider || null,
      video_id: fm.video_id || null,
    };
  });
}

export async function getLesson(sb, code) {
  const { data } = await sb.from('lessons').select('*').eq('code', code).single();
  return data || null;
}

export async function getGlossaryMap(sb) {
  const { data = [] } = await sb.from('glossary_terms').select('*');
  const map = {};
  for (const t of data || []) {
    map[t.term.toLowerCase()] = { term: t.term, def: t.definition, primer: t.primer_code, see_also: t.see_also || [] };
  }
  return map;
}

export async function getUserProgress(sb, userId) {
  if (!userId) return [];
  const { data = [] } = await sb.from('progress').select('lesson_code').eq('user_id', userId);
  return (data || []).map((r) => r.lesson_code);
}

export async function getUserDeliverables(sb, userId) {
  if (!userId) return {};
  const { data = [] } = await sb.from('deliverables').select('lesson_code,content').eq('user_id', userId);
  return Object.fromEntries((data || []).map((r) => [r.lesson_code, r.content]));
}

// ---- mutations (browser client, RLS enforces per-user) ----
export async function setProgress(sb, userId, code, done) {
  if (done) return sb.from('progress').upsert({ user_id: userId, lesson_code: code }, { onConflict: 'user_id,lesson_code' });
  return sb.from('progress').delete().eq('user_id', userId).eq('lesson_code', code);
}

export async function saveDeliverable(sb, userId, code, content) {
  return sb.from('deliverables').upsert(
    { user_id: userId, lesson_code: code, content, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_code' }
  );
}
