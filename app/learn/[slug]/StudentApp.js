'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setProgress, saveDeliverable } from '@/lib/content';
import { Markdown, GlossarySheet } from '@/components/Markdown';
import {
  Flame, BookOpen, CheckCircle2, Lock, Moon, Sun, Compass, ArrowRight, ChevronRight,
  Target, Trophy, PenLine, GraduationCap, Wrench, Briefcase, Sparkles, User, LogOut, Loader2, Settings,
  Play, ExternalLink
} from 'lucide-react';

const layerIcon = (l, s = 16) =>
  l === 'craft' ? <Wrench size={s} /> : l === 'business' ? <Briefcase size={s} />
  : l === 'foundation' ? <Sparkles size={s} /> : <BookOpen size={s} />;

/* ---------------- Journey ---------------- */
function Journey({ skill, phases, completed, unlocked, phaseDone, next, onOpen, onContinue, streak, doneCount, total }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  return (
    <div className="lp-screen">
      <div className="lp-eyebrow">Your journey</div>
      <h1 className="lp-h1">{skill.title}</h1>
      <p className="lp-sub">{skill.tagline || skill.goal}</p>

      <div className="lp-streak" style={{ marginTop: 18 }}>
        <div className="lp-flame"><Flame size={22} /></div>
        <div>
          <div className="n">{streak}-day streak</div>
          <div className="l">Showing up beats cramming. Keep the fire going.</div>
        </div>
        <div className="lp-week">
          {days.map((d, i) => {
            const hit = i <= todayIdx && (todayIdx - i) < streak;
            return <div key={i} className={'lp-day' + (hit ? ' hit' : '') + (i === todayIdx ? ' today' : '')}>{d}</div>;
          })}
        </div>
      </div>

      {next && (
        <div className="lp-hero">
          <div className="glow" />
          <div className="k">Continue where you left off</div>
          <div className="t">{next.title}</div>
          <button className="go" onClick={onContinue}>Resume lesson <ArrowRight size={16} /></button>
        </div>
      )}

      <div style={{ margin: '20px 0 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-soft)' }}>Progress</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{pct}% · {doneCount}/{total}</span>
      </div>
      <div className="lp-prog"><i style={{ width: pct + '%' }} /></div>

      {phases.map((ph, pi) => {
        const locked = !unlocked(pi); const done = phaseDone(pi);
        const dCount = ph.modules.filter((m) => completed.has(m.code)).length;
        return (
          <div key={ph.id || pi} className={'lp-phase' + (locked ? ' locked' : '') + (done ? ' done' : '')}>
            <div className="lp-phead">
              <div className="lp-pnum">{done ? <CheckCircle2 size={20} /> : ph.number}</div>
              <div style={{ flex: 1 }}>
                <div className="lp-ptitle">{ph.name}</div>
                <div className="lp-pgoal">{ph.goal}</div>
              </div>
              {locked && <Lock size={16} color="var(--ink-faint)" />}
            </div>
            <div className="lp-track">
              {ph.modules.map((m) => {
                const md = completed.has(m.code);
                return (
                  <button key={m.code} className="lp-mod" disabled={locked} onClick={() => onOpen(m.code)}>
                    <div className="lp-mtick" style={{ background: md ? 'var(--foundation)' : 'var(--' + (m.layer || 'craft') + '-soft)', color: md ? '#fff' : 'var(--' + (m.layer || 'craft') + ')' }}>
                      {md ? <CheckCircle2 size={17} /> : locked ? <Lock size={15} /> : layerIcon(m.layer)}
                    </div>
                    <div className="lp-mbody">
                      <div className="lp-mtitle">{m.title}</div>
                      <div className="lp-mmeta">
                        {m.layer && <span className={'lp-tag ' + m.layer}>{m.layer}</span>}
                        {m.mode && <span>{m.mode}</span>}{m.est_min ? <><span>·</span><span>{m.est_min} min</span></> : null}
                      </div>
                    </div>
                    {!locked && <ChevronRight size={17} color="var(--ink-faint)" />}
                  </button>
                );
              })}
              <div className={'lp-gate' + (done ? ' met' : '')}>
                <div className="gk">{done ? <><Trophy size={15} /> Gate cleared</> : <><Target size={15} /> Phase gate · {dCount}/{ph.modules.length} done</>}</div>
                <div className="gt">{ph.gate_text}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Branch companion (platform execution) ---------------- */
function BranchCompanion({ branch, glossary, onTerm, isDone, onToggle, work, onWork, onWorkSave }) {
  if (!branch) return null;
  const label = branch.platform_label || 'the tool';
  const hasVideo = branch.video_provider === 'youtube' && branch.video_id;
  const embedUrl = hasVideo ? `https://www.youtube.com/embed/${branch.video_id}` : null;
  const watchUrl = hasVideo ? `https://www.youtube.com/watch?v=${branch.video_id}` : null;
  return (
    <div className="lp-branch">
      <div className="lp-branch-head">
        <Play size={17} />
        <span className="t">Now build it in {label}</span>
        <span className="lp-tag branch" style={{ marginLeft: 'auto' }}>Build</span>
      </div>

      {embedUrl ? (
        <div className="cp-video">
          <iframe
            src={embedUrl}
            title={branch.title || ('Build it in ' + label)}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="lp-note">A walkthrough video is coming soon for this step.</div>
      )}

      <div className="lp-branch-body">
        {branch.body_md ? <Markdown text={branch.body_md} glossary={glossary} onTerm={onTerm} /> : null}

        {watchUrl && (
          <a className="lp-branch-fallback" href={watchUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Trouble loading the video? Open it on YouTube
          </a>
        )}

        {branch.deliverable && (
          <div className="lp-cap" style={{ marginTop: 16 }}>
            <div className="ct"><PenLine size={18} color="var(--branch)" /> Prove you built it</div>
            <div className="cd">{branch.deliverable}</div>
            <textarea placeholder="Paste a link or screenshot URL of what you built…" value={work || ''} onChange={(e) => onWork(e.target.value)} onBlur={onWorkSave} />
            {work && work.trim() && <div className="saved"><CheckCircle2 size={14} /> Saved to your work</div>}
          </div>
        )}

        <button className={'lp-btn branch' + (isDone ? ' done' : '')} onClick={onToggle} style={{ marginTop: 14 }}>
          {isDone ? <><CheckCircle2 size={18} /> Built — tap to undo</> : <>Mark built <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Lesson ---------------- */
function Lesson({ mod, phaseN, bodyData, loading, glossary, onTerm, onBack, isDone, onToggle, work, onWork, onWorkSave,
  branch, branchDone, onBranchToggle, branchWork, onBranchWork, onBranchWorkSave }) {
  const body = bodyData?.body_md;
  const deliverable = bodyData?.deliverable || mod.deliverable;
  return (
    <div className="lp-screen">
      <button className="lp-back" onClick={onBack}><ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} /> Journey</button>
      <div className="lp-lhead">
        <div className="lp-eyebrow" style={{ color: 'var(--' + (mod.layer || 'craft') + ')' }}>Phase {phaseN} · {mod.mode || ''}{mod.est_min ? ' · ' + mod.est_min + ' min' : ''}</div>
        <h1 className="lp-h1" style={{ fontSize: 27 }}>{mod.title}</h1>
      </div>

      {loading ? (
        <div className="lp-center"><Loader2 size={22} className="spin" /></div>
      ) : body ? (
        <Markdown text={body} glossary={glossary} onTerm={onTerm} />
      ) : (
        <>
          {mod.blurb && <div className="lp-ov"><h4>In this lesson</h4><p style={{ fontSize: 15.5, lineHeight: 1.55 }}>{mod.blurb}</p></div>}
          <div className="lp-note">This lesson has no body yet — an admin can add its content.</div>
        </>
      )}

      {deliverable && (
        <div className="lp-cap">
          <div className="ct"><PenLine size={18} color="var(--accent)" /> Your deliverable</div>
          <div className="cd">{deliverable}</div>
          <textarea placeholder="Capture your work here — saved to your portfolio…" value={work || ''} onChange={(e) => onWork(e.target.value)} onBlur={onWorkSave} />
          {work && work.trim() && <div className="saved"><CheckCircle2 size={14} /> Saved to your work</div>}
        </div>
      )}

      <button className={'lp-btn' + (isDone ? ' done' : '')} onClick={onToggle} style={{ marginTop: 14 }}>
        {isDone ? <><CheckCircle2 size={18} /> Completed — tap to undo</> : <>Mark lesson complete <ArrowRight size={18} /></>}
      </button>

      {branch && (
        <BranchCompanion
          branch={branch}
          glossary={glossary}
          onTerm={onTerm}
          isDone={branchDone}
          onToggle={onBranchToggle}
          work={branchWork}
          onWork={onBranchWork}
          onWorkSave={onBranchWorkSave}
        />
      )}
    </div>
  );
}

/* ---------------- Work ---------------- */
function Work({ items, work, onOpen }) {
  const entries = items.filter((m) => work[m.code] && work[m.code].trim());
  return (
    <div className="lp-screen">
      <div className="lp-eyebrow">Portfolio</div>
      <h1 className="lp-h1">Your work</h1>
      <p className="lp-sub">Every deliverable you capture becomes proof you can show clients.</p>
      <div className="lp-work" style={{ marginTop: 18 }}>
        {entries.length === 0 ? (
          <div className="lp-empty"><BookOpen size={30} style={{ opacity: .4 }} /><p style={{ marginTop: 10 }}>Nothing captured yet.<br />Do a lesson&apos;s deliverable and it appears here.</p></div>
        ) : entries.map((m) => (
          <div key={m.code} className="lp-wcard" onClick={() => onOpen(m.openCode || m.code)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {m.isBranch
                ? <span className="lp-tag branch">{m.platform_label || 'Build'}</span>
                : (m.layer && <span className={'lp-tag ' + m.layer}>{m.layer}</span>)}
              <span className="wt">{m.title}</span>
            </div>
            <div className="wtext">{work[m.code].length > 220 ? work[m.code].slice(0, 220) + '…' : work[m.code]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- You ---------------- */
function You({ name, doneCount, total, streak, gatesMet, phasesCount, isAdmin, onSignOut }) {
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const router = useRouter();
  return (
    <div className="lp-screen">
      <div className="lp-eyebrow">Profile</div>
      <h1 className="lp-h1">Hi, {name}</h1>
      <div className="lp-stat" style={{ marginTop: 18 }}>
        <div className="lp-statcard"><div className="v">{pct}%</div><div className="l">Journey complete</div></div>
        <div className="lp-statcard"><div className="v">{doneCount}</div><div className="l">Lessons done</div></div>
      </div>
      <div className="lp-stat" style={{ marginTop: 12 }}>
        <div className="lp-statcard"><div className="v" style={{ color: '#E1402A' }}>{streak}</div><div className="l">Day streak 🔥</div></div>
        <div className="lp-statcard"><div className="v" style={{ color: 'var(--foundation)' }}>{gatesMet}/{phasesCount}</div><div className="l">Gates cleared</div></div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isAdmin && <button className="lp-btn" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={() => router.push('/admin')}><Settings size={17} /> Admin</button>}
        <button className="lp-btn" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={onSignOut}><LogOut size={17} /> Sign out</button>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function StudentApp({ userId, name, isAdmin, skill, phases, glossary, branches, initialCompleted, initialWork }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [view, setView] = useState('journey');
  const [code, setCode] = useState(null);
  const [completed, setCompleted] = useState(new Set(initialCompleted || []));
  const [work, setWork] = useState(initialWork || {});
  const [bodies, setBodies] = useState({});
  const [loadingBody, setLoadingBody] = useState(false);
  const [theme, setTheme] = useState('bright');
  const [sheet, setSheet] = useState(null);
  const [streak, setStreak] = useState(1);

  const allBranches = useMemo(() => branches || [], [branches]);
  const branchByTrunk = useMemo(() => {
    const m = {};
    for (const b of allBranches) if (b.pairs_with) m[b.pairs_with] = b;
    return m;
  }, [allBranches]);

  const flat = useMemo(() => phases.flatMap((p) => p.modules.map((m) => ({ ...m, phaseN: p.number }))), [phases]);
  const total = flat.length;
  const doneCount = completed.size;

  // Portfolio items = journey lessons + branch companions (branches aren't in the
  // journey, but their captured work is real portfolio proof). A branch card opens
  // its paired trunk lesson, where the companion lives.
  const workItems = useMemo(() => [
    ...flat,
    ...allBranches.map((b) => ({ code: b.code, title: b.title, isBranch: true, platform_label: b.platform_label, openCode: b.pairs_with })),
  ], [flat, allBranches]);

  const phaseDone = (pi) => phases[pi].modules.length > 0 && phases[pi].modules.every((m) => completed.has(m.code));
  const unlocked = (pi) => pi === 0 || phaseDone(pi - 1);
  const gatesMet = phases.filter((p, pi) => phaseDone(pi)).length;
  const next = useMemo(() => {
    for (let pi = 0; pi < phases.length; pi++) { if (!unlocked(pi)) break; const m = phases[pi].modules.find((mm) => !completed.has(mm.code)); if (m) return m; }
    return null;
  }, [completed, phases]);
  const cur = code ? flat.find((m) => m.code === code) : null;
  const curBranch = cur ? branchByTrunk[cur.code] : null;

  // theme (persisted per device) + streak
  useEffect(() => {
    try {
      const t = localStorage.getItem('cp_theme'); if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
      const today = new Date().toDateString();
      const raw = JSON.parse(localStorage.getItem('cp_streak') || 'null');
      let s = 1;
      if (raw) {
        if (raw.date === today) s = raw.n;
        else { const y = new Date(Date.now() - 86400000).toDateString(); s = raw.date === y ? raw.n + 1 : 1; }
      }
      localStorage.setItem('cp_streak', JSON.stringify({ date: today, n: s }));
      setStreak(s);
    } catch {}
  }, []);

  function toggleTheme() {
    const t = theme === 'bright' ? 'dark' : 'bright';
    setTheme(t); document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('cp_theme', t); } catch {}
  }

  async function open(c) {
    setCode(c); setView('lesson'); window.scrollTo({ top: 0 });
    if (!bodies[c]) {
      setLoadingBody(true);
      const { data } = await sb.from('lessons').select('body_md,deliverable,mode,est_min,title,layer').eq('code', c).single();
      setBodies((b) => ({ ...b, [c]: data || { body_md: '' } }));
      setLoadingBody(false);
    }
  }

  async function toggleComplete(c) {
    const willDo = !completed.has(c);
    setCompleted((s) => { const n = new Set(s); willDo ? n.add(c) : n.delete(c); return n; });
    try { await setProgress(sb, userId, c, willDo); } catch {}
  }

  function updateWork(c, v) { setWork((w) => ({ ...w, [c]: v })); }
  async function persistWork(c) { try { await saveDeliverable(sb, userId, c, work[c] || ''); } catch {} }

  async function signOut() { await sb.auth.signOut(); router.push('/login'); router.refresh(); }

  return (
    <div className="lp" data-theme={theme}>
      <div className="lp-app">
        <div className="lp-top">
          <div className="lp-brand"><span className="dot"><GraduationCap size={16} /></span> Craftpath</div>
          <div className="lp-spacer" />
          <span className="lp-chip"><Flame size={14} /> {streak}</span>
          <button className="lp-iconbtn" onClick={toggleTheme}>{theme === 'bright' ? <Moon size={17} /> : <Sun size={17} />}</button>
        </div>

        {view === 'journey' && <Journey skill={skill} phases={phases} completed={completed} unlocked={unlocked} phaseDone={phaseDone} next={next} onOpen={open} onContinue={() => next && open(next.code)} streak={streak} doneCount={doneCount} total={total} />}
        {view === 'lesson' && cur && <Lesson mod={cur} phaseN={cur.phaseN} bodyData={bodies[cur.code]} loading={loadingBody} glossary={glossary} onTerm={setSheet} onBack={() => setView('journey')} isDone={completed.has(cur.code)} onToggle={() => toggleComplete(cur.code)} work={work[cur.code]} onWork={(v) => updateWork(cur.code, v)} onWorkSave={() => persistWork(cur.code)}
          branch={curBranch}
          branchDone={curBranch ? completed.has(curBranch.code) : false}
          onBranchToggle={() => curBranch && toggleComplete(curBranch.code)}
          branchWork={curBranch ? work[curBranch.code] : ''}
          onBranchWork={(v) => curBranch && updateWork(curBranch.code, v)}
          onBranchWorkSave={() => curBranch && persistWork(curBranch.code)}
        />}
        {view === 'work' && <Work items={workItems} work={work} onOpen={open} />}
        {view === 'you' && <You name={name} doneCount={doneCount} total={total} streak={streak} gatesMet={gatesMet} phasesCount={phases.length} isAdmin={isAdmin} onSignOut={signOut} />}
      </div>

      <div className="lp-nav">
        <button className={'lp-navbtn' + (view === 'journey' ? ' on' : '')} onClick={() => setView('journey')}><Compass size={21} />Journey</button>
        <button className={'lp-navbtn' + (view === 'work' ? ' on' : '')} onClick={() => setView('work')}><BookOpen size={21} />Work</button>
        <button className={'lp-navbtn' + (view === 'you' ? ' on' : '')} onClick={() => setView('you')}><User size={21} />You</button>
      </div>

      {sheet && <GlossarySheet term={sheet} glossary={glossary} onClose={() => setSheet(null)} />}
    </div>
  );
}
