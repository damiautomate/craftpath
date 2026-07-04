'use client';
import { useState } from 'react';
import { BookOpen, Layers, BookMarked, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function ImportPage() {
  const [res, setRes] = useState({});
  const [busy, setBusy] = useState(null);

  async function importLessons(files) {
    if (!files?.length) return;
    setBusy('lessons');
    try {
      const items = await Promise.all([...files].map(async (f) => ({ name: f.name, content: await f.text() })));
      const r = await fetch('/api/admin/import/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      setRes((s) => ({ ...s, lessons: await r.json() }));
    } catch (e) { setRes((s) => ({ ...s, lessons: { error: e.message } })); }
    setBusy(null);
  }
  async function importOne(kind, file) {
    if (!file) return;
    setBusy(kind);
    try {
      const content = await file.text();
      const r = await fetch('/api/admin/import/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      setRes((s) => ({ ...s, [kind]: await r.json() }));
    } catch (e) { setRes((s) => ({ ...s, [kind]: { error: e.message } })); }
    setBusy(null);
  }

  const Result = ({ r }) => {
    if (!r) return null;
    if (r.error) return <div className="imp-res err"><AlertTriangle size={15} /> {r.error}</div>;
    if (r.saved) return <div className="imp-res ok"><CheckCircle2 size={15} /> Saved {r.saved.length} lesson(s): {r.saved.join(', ') || '—'}{r.errors?.length ? ` · ${r.errors.length} failed` : ''}</div>;
    if (r.skill) return <div className="imp-res ok"><CheckCircle2 size={15} /> Imported “{r.title}”: {r.phases} phases, {r.modules} modules.</div>;
    if (r.terms) return <div className="imp-res ok"><CheckCircle2 size={15} /> Imported {r.terms} glossary terms.</div>;
    return null;
  };

  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Import content</h1>
      <p className="adm-sub">Upload your markdown lessons and YAML files. They&apos;re parsed and stored — students see them immediately.</p>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><BookOpen size={18} /></span><div><b>Lessons</b><span>Upload one or many <code>.md</code> files.</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".md,.markdown,text/markdown" multiple hidden onChange={(e) => importLessons(e.target.files)} />
          {busy === 'lessons' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose .md files'}
        </label>
        <Result r={res.lessons} />
      </div>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><Layers size={18} /></span><div><b>Skill manifest</b><span>Upload a <code>skill.yaml</code> to build the journey (phases, modules, gates).</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".yaml,.yml" hidden onChange={(e) => importOne('manifest', e.target.files[0])} />
          {busy === 'manifest' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose skill.yaml'}
        </label>
        <Result r={res.manifest} />
      </div>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><BookMarked size={18} /></span><div><b>Glossary</b><span>Upload a <code>glossary.yaml</code> of terms.</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".yaml,.yml" hidden onChange={(e) => importOne('glossary', e.target.files[0])} />
          {busy === 'glossary' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose glossary.yaml'}
        </label>
        <Result r={res.glossary} />
      </div>

      <p className="adm-note">Tip: import the skill manifest and lessons together — the manifest defines the journey order; the lessons provide the content. Re-importing a file updates it.</p>
    </div>
  );
}
