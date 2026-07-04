import { createClient } from '@/lib/supabase/server';
import PublishToggle from './PublishToggle';

export default async function SkillsList() {
  const sb = createClient();
  const { data: skills = [] } = await sb.from('skills').select('*').order('sort');
  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Skills <span className="adm-count">{skills?.length || 0}</span></h1>
      <p className="adm-sub">Each skill is a journey built from an imported manifest. Publish one to make it visible to students.</p>
      <div className="adm-table">
        {(!skills || skills.length === 0) && <div className="adm-empty">No skills yet. Import a skill.yaml on the Import page.</div>}
        {skills?.map((s) => (
          <div key={s.id} className="adm-row static">
            <span className="adm-rtitle">{s.title}</span>
            <span className="adm-slug">/{s.slug}</span>
            <PublishToggle id={s.id} published={s.published} />
          </div>
        ))}
      </div>
    </div>
  );
}
