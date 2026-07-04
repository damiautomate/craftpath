'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/learn';
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg(null);
    const sb = createClient();
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ ok: true, t: 'Account created. If email confirmation is on, confirm via the link, then sign in.' });
        setMode('signin');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next); router.refresh();
      }
    } catch (e) { setMsg({ ok: false, t: e.message || 'Something went wrong.' }); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="authcard">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 6 }}>
          <span className="dot"><GraduationCap size={18} /></span> Craftpath
        </div>
        <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password"
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {msg && <div className={'authmsg ' + (msg.ok ? 'ok' : 'err')}>{msg.t}</div>}
        <button className="btn" disabled={busy || !email || !password} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        <div className="authswitch">
          {mode === 'signin' ? 'No account?' : 'Have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null); }}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
