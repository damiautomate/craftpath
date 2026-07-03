'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Markdown, GlossarySheet } from '@/components/Markdown';
import { ChevronLeft, Save, Eye, Pencil, CheckCircle2 } from 'lucide-react';

export default function LessonEditor({ lesson, glossary }) {
  const [title, setTitle] = useState(lesson.title || '');
  const [status, setStatus] = useState(lesson.status || 'draft');
  const [body, setBody] = useState(lesson.body_md || '');
  const [tab, setTab] = useState('edit');
  const [term, setTerm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg(null);
    const sb = createClient();
    const { error } = await sb.from('lessons').update({ title, status, body_md: body, updated_at: new Date().toISOString() }).eq('code', lesson.code);
    setMsg(error ? { ok: false, t: error.message } : { ok: true, t: 'Saved' });
    setBusy(false);
  }

  return (
    <div className="adm-pad">
      <Link href="/admin/lessons" className="adm-back"><ChevronLeft size={16} /> Lessons</Link>
      <div className="adm-edithead">
        <div>
          <span className="adm-code">{lesson.code}</span>
          <input className="adm-titleinput" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="adm-editactions">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="adm-select">
            <option value="draft">draft</option><option value="complete">complete</option>
            <option value="placeholder">placeholder</option><option value="stub">stub</option>
          </select>
          <button className="btn sm" disabled={busy} onClick={save}><Save size={15} /> {busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {msg && <div className={'imp-res ' + (msg.ok ? 'ok' : 'err')}>{msg.ok && <CheckCircle2 size={15} />}{msg.t}</div>}

      <div className="adm-tabs">
        <button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}><Pencil size={14} /> Edit</button>
        <button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Preview</button>
      </div>

      {tab === 'edit'
        ? <textarea className="adm-body" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
        : <div className="adm-preview"><Markdown text={body} glossary={glossary} onTerm={setTerm} /></div>}

      {term && <GlossarySheet term={term} glossary={glossary} onClose={() => setTerm(null)} />}
    </div>
  );
}
