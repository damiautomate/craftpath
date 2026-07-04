'use client';
import { useState } from 'react';
import { Package, BookOpen, Layers, BookMarked, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function ImportPage() {
  const [res, setRes] = useState({});
  const [busy, setBusy] = useState(null);

  async function importZip(file) {
    if (!file) return;
    setBusy('bulk'); setRes((s) => ({ ...s, bulk: undefined }));
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch('/api/admin/import/bulk', { method: 'POST', body: fd });
      const data = await r.json();
      setRes((s) => ({ ...s, bulk: data }));
    } catch (e) { setRes((s) => ({ ...s, bulk: { error: e.message } })); }
    setBusy(null);
  }

  async function importLessons(files) {
    if (!files?.length) return;
    setBusy('lessons');
    try {
      const items = await Promise.all([...files].map(async (f) => ({ name: f.name, content: await f.text() })));
      const r = await fetch('/api/admin/import/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await r.json();
      setRes((s) => ({ ...s, lessons: data }));
    } catch (e) { setRes((s) => ({ ...s, lessons: { error: e.message } })); }
    setBusy(null);
  }

  async function importOne(kind, file) {
    if (!file) return;
    setBusy(kind);
    try {
      const content = await file.text();
      const r = await fetch('/api/admin/import/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      const data = await r.json();
      setRes((s) => ({ ...s, [kind]: data }));
    } catch (e) { setRes((s) => ({ ...s, [kind]: { error: e.message } })); }
    setBusy(null);
  }

  const Result = ({ r }) => {
    if (!r) return null;
    if (r.error) return <div className="imp-res err"><AlertTriangle size={15} /> {r.error}</div>;
    if (r.saved) return <div className="imp-res ok"><CheckCircle2 size={15} /> Saved {r.saved.length} lesson(s){r.errors?.length ? ` · ${r.errors.length} failed` : ''}.</div>;
    if (r.skill) return <div className="imp-res ok"><CheckCircle2 size={15} /> Imported “{r.title}”: {r.phases} phases, {r.modules} modules.</div>;
    if (r.terms) return <div className="imp-res ok"><CheckCircle2 size={15} /> Imported {r.terms} glossary terms.</div>;
    return null;
  };

  const BulkResult = ({ r }) => {
    if (!r) return null;
    if (r.error) return <div className="imp-res err"><AlertTriangle size={15} /> {r.error}</div>;
    const skillsOk = (r.skills || []).filter((s) => !s.error);
    const failed = r.lessons?.errors?.length || 0;
    return (
      <div className="imp-res ok" style={{ alignItems: 'flex-start' }}>
        <CheckCircle2 size={15} style={{ marginTop: 2 }} />
        <span>
          Imported <b>{r.lessons?.saved?.length || 0}</b> lessons{failed ? ` (${failed} failed)` : ''}, <b>{r.glossary || 0}</b> glossary terms, and <b>{skillsOk.length}</b> skill(s).
          {skillsOk.map((s, i) => <span key={i}> · {s.title}: {s.phases}ph/{s.modules}mods</span>)}
          <br />Now go to <b>Skills</b> and hit <b>Publish</b>.
        </span>
      </div>
    );
  };

  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Import content</h1>
      <p className="adm-sub">Drop the whole content bundle and it&apos;s sorted into place — or import pieces individually below.</p>

      {/* ONE-DROP BULK UPLOAD */}
      <div className="imp-card" style={{ borderColor: 'var(--accent)', borderWidth: 1.5 }}>
        <div className="imp-head">
          <span className="imp-ic"><Package size={18} /></span>
          <div><b>Upload everything (.zip)</b><span>One drop. Unpacks the bundle and files every lesson, the glossary, and the manifest to the right place — in the right order.</span></div>
        </div>
        <label className="imp-drop" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          <input type="file" accept=".zip,application/zip" hidden onChange={(e) => importZip(e.target.files[0])} />
          {busy === 'bulk' ? <><Loader2 size={16} className="spin" /> Unpacking &amp; importing…</> : 'Choose your content .zip'}
        </label>
        <BulkResult r={res.bulk} />
      </div>

      <div className="adm-note" style={{ margin: '18px 0 10px' }}>— or import pieces individually —</div>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><BookOpen size={18} /></span><div><b>Lessons</b><span>Upload one or many <code>.md</code> files.</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".md,.markdown,text/markdown" multiple hidden onChange={(e) => importLessons(e.target.files)} />
          {busy === 'lessons' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose .md files'}
        </label>
        <Result r={res.lessons} />
      </div>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><Layers size={18} /></span><div><b>Skill manifest</b><span>Upload a <code>skill.yaml</code> to build the journey.</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".yaml,.yml" hidden onChange={(e) => importOne('manifest', e.target.files[0])} />
          {busy === 'manifest' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose skill.yaml'}
        </label>
        <Result r={res.manifest} />
      </div>

      <div className="imp-card">
        <div className="imp-head"><span className="imp-ic"><BookMarked size={18} /></span><div><b>Glossary</b><span>Upload a <code>glossary.yaml</code>.</span></div></div>
        <label className="imp-drop">
          <input type="file" accept=".yaml,.yml" hidden onChange={(e) => importOne('glossary', e.target.files[0])} />
          {busy === 'glossary' ? <><Loader2 size={16} className="spin" /> Importing…</> : 'Choose glossary.yaml'}
        </label>
        <Result r={res.glossary} />
      </div>
    </div>
  );
}
