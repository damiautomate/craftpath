import { createClient } from '@/lib/supabase/server';

export default async function GlossaryList() {
  const sb = createClient();
  const { data: terms = [] } = await sb.from('glossary_terms').select('*').order('term');
  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Glossary <span className="adm-count">{terms?.length || 0}</span></h1>
      <p className="adm-sub">Terms auto-link inside lessons and open a popover for students.</p>
      <div className="adm-table">
        {(!terms || terms.length === 0) && <div className="adm-empty">No terms yet. Import a glossary.yaml on the Import page.</div>}
        {terms?.map((t) => (
          <div key={t.id} className="adm-gterm">
            <div className="gt-top"><b>{t.term}</b>{t.primer_code && <span className="gt-primer">{t.primer_code}</span>}</div>
            <div className="gt-def">{t.definition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
