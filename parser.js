// Read-side data access. Pass in a Supabase client (server or browser).

export async function getPublishedSkills(sb) {
  const { data } = await sb.from('skills').select('*').eq('published', true).order('sort');
  return data || [];
}

export async function getAllSkills(sb) {
  const { data } = await sb.from('skills').select('*').order('sort');
  return data || [];
}

export async function getSkill(sb, slug) {
  const { data } = await sb.from('skills').select('*').eq('slug', slug).single();
  return data || null;
}

// The selectable tracks (platforms) for a skill.
export async function getSkillTracks(sb, skillId) {
  if (!skillId) return [];
  const { data = [] } = await sb.from('skill_tracks').select('track,label,blurb,sort').eq('skill_id', skillId).order('sort');
  return data || [];
}

// A student's chosen track for a skill (null until they choose).
export async function getEnrollment(sb, userId, skillId) {
  if (!userId || !skillId) return null;
  const { data } = await sb.from('enrollments').select('track').eq('user_id', userId).eq('skill_id', skillId).maybeSingle();
  return data ? data.track : null;
}

export async function setEnrollment(sb, userId, skillId, track) {
  return sb.from('enrollments').upsert(
    { user_id: userId, skill_id: skillId, track, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,skill_id' }
  );
}

// Assemble a full journey for a given student TRACK.
// A phase's visible stops = its neutral modules (track null) + the modules for the
// student's chosen track, in authored order. Neutral-track students see neutral only.
export async function getSkillJourney(sb, slug, track = null) {
  const { data: skill } = await sb.from('skills').select('*').eq('slug', slug).single();
  if (!skill) return null;

  const { data: phases = [] } = await sb.from('phases').select('*').eq('skill_id', skill.id).order('sort');
  const phaseIds = phases.map((p) => p.id);
  const { data: pmods = [] } = phaseIds.length
    ? await sb.from('phase_modules').select('*').in('phase_id', phaseIds).order('sort')
    : { data: [] };

  const codes = [...new Set(pmods.map((pm) => pm.lesson_code))];
  const { data: lessons = [] } = codes.length
    ? await sb.from('lessons').select('code,title,layer,type,track,mode,est_min,blurb,deliverable,status,video_provider,video_id').in('code', codes)
    : { data: [] };
  const lessonMap = Object.fromEntries((lessons || []).map((l) => [l.code, l]));

  const visible = (pm) => pm.track == null || pm.track === track;

  const phasesOut = (phases || []).map((p) => {
    const pm = (pmods || []).filter((x) => x.phase_id === p.id);
    const hasTracks = pm.some((x) => x.track != null);      // does this phase carry any platform stops?
    const modules = pm.filter(visible).map((x) => {
      const l = lessonMap[x.lesson_code];
      const t = x.track || (l && l.track) || null;
      return l
        ? { code: x.lesson_code, layer: x.layer || l.layer, track: t, title: l.title, mode: l.mode, est_min: l.est_min, blurb: l.blurb, deliverable: l.deliverable, status: l.status, has_video: !!(l.video_provider && l.video_id) }
        : { code: x.lesson_code, layer: x.layer, track: t, title: x.lesson_code, missing: true };
    });
    return { id: p.id, number: p.number, name: p.name, goal: p.goal, gate_text: p.gate_text, has_tracks: hasTracks, modules };
  });

  return { skill, phases: phasesOut };
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

// Titles/track for every lesson the user has captured work in — so the portfolio can
// show (and open) work from ANY track, even one they've since switched away from.
export async function getUserWorkMeta(sb, userId) {
  if (!userId) return {};
  const { data: dels = [] } = await sb.from('deliverables').select('lesson_code').eq('user_id', userId);
  const codes = [...new Set((dels || []).map((d) => d.lesson_code))];
  if (!codes.length) return {};
  const { data: lessons = [] } = await sb.from('lessons').select('code,title,layer,track').in('code', codes);
  return Object.fromEntries((lessons || []).map((l) => [l.code, { title: l.title, layer: l.layer, track: l.track }]));
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
