'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function PublishToggle({ id, published }) {
  const [on, setOn] = useState(published);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from('skills').update({ published: !on }).eq('id', id);
    if (!error) setOn(!on);
    setBusy(false);
  }
  return (
    <button className={'adm-pub' + (on ? ' on' : '')} onClick={toggle} disabled={busy}>
      {busy ? <Loader2 size={14} className="spin" /> : on ? <Eye size={14} /> : <EyeOff size={14} />}
      {on ? 'Published' : 'Draft'}
    </button>
  );
}
