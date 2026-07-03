import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function LessonsList() {
  const sb = createClient();
  const { data: lessons = [] } = await sb.from('lessons').select('code,title,layer,type,status,updated_at').order('code');
  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Lessons <span className="adm-count">{lessons?.length || 0}</span></h1>
      <p className="adm-sub">Every content unit. Click one to edit or preview.</p>
      <div className="adm-table">
        {(!lessons || lessons.length === 0) && <div className="adm-empty">No lessons yet. Go to Import to upload your .md files.</div>}
        {lessons?.map((l) => (
          <Link key={l.code} href={`/admin/lessons/${encodeURIComponent(l.code)}`} className="adm-row">
            <span className="adm-code">{l.code}</span>
            <span className="adm-rtitle">{l.title}</span>
            {l.layer && <span className={'lp-tag ' + l.layer}>{l.layer}</span>}
            <span className={'adm-status s-' + l.status}>{l.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
