'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setProgress, saveDeliverable, setEnrollment } from '@/lib/content';
import { Markdown, GlossarySheet } from '@/components/Markdown';
import {
  Flame, BookOpen, CheckCircle2, Lock, Moon, Sun, Compass, ArrowRight, ChevronRight,
  Target, Trophy, PenLine, GraduationCap, Wrench, Briefcase, Sparkles, User, LogOut, Loader2, Settings,
  Play, ExternalLink, Layers, Check
} from 'lucide-react';

const layerIcon = (l, s = 16) =>
  l === 'craft' ? <Wrench size={s} /> : l === 'business' ? <Briefcase size={s} />
  : l === 'foundation' ? <Sparkles size={s} /> : <BookOpen size={s} />;

/* ---------------- Video ---------------- */
function VideoEmbed({ provider, id, title }) {
  if (provider !== 'youtube' || !id) return null;
  return (
    <div className="cp-video">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title || 'Lesson video'}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function VideoBlock({ provider, id, title, kind, watchLabel }) {
  const has = provider === 'youtube' && id;
  const watchUrl = has ? `https://www.youtube.com/watch?v=${id}` : null;
  return (
    <div className={'lp-video ' + (kind === 'primary' ? 'primary' : 'support')}>
      <div className="lp-video-head"><Play size={15} /> {watchLabel}</div>
      {has ? <VideoEmbed provider={provider} id={id} title={title} /> : <div className="lp-note">A walkthrough video is coming soon for this lesson.</div>}
      {watchUrl && <a className="lp-video-fallback" href={watchUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Trouble loading? Open on YouTube</a>}
    </div>
  );
}

/* ---------------- Platform picker (bottom sheet) ---------------- */
function Picker({ tracks, trackLabel, current, onPick, onClose, busy }) {
  return (
    <div className="lp-sheet-wrap" onClick={busy ? undefined : onClose}>
      <div className="lp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="lp-picker-title">Choose your {trackLabel}</div>
        <div className="lp-picker-sub">This is the tool you&apos;ll specialize in. You can change it later — your progress is kept.</div>
        <div className="lp-picker-list">
          {tracks.map((t) => (
            <button key={t.track} className={'lp-picker-opt' + (current === t.track ? ' on' : '')} disabled={busy} onClick={() => onPick(t.track)}>
              <div className="ic"><Layers size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="l">{t.label}</div>
                {t.blurb && <div className="b">{t.blurb}</div>}
              </div>
              {current === t.track ? <Check size={18} /> : busy ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
            </button>
          ))}
          {tracks.length === 0 && <div className="lp-note">No platforms are available yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Journey ---------------- */
function Journey({ skill, phases, completed, unlocked, phaseDone, requiresTrack, next, onOpen, onContinue, streak, doneCount, total,
  chosenTrack, trackLabel, trackLabelText, needsChoice, onOpenPicker }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  return (
    <div className="lp-screen">
      <div className="lp-eyebrow">Your journey</div>
      <h1 className="lp-h1">{skill.title}</h1>
      <p className="lp-sub">{skill.tagline || skill.goal}</p>

      {chosenTrack && (
        <button className="lp-platchip" onClick={onOpenPicker}>
          <Layers size={14} /> {trackLabel}: <b>{trackLabelText}</b> <span className="ch">Change</span>
        </button>
      )}

      <div className="lp-streak" style={{ marginTop: 16 }}>
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

      {needsChoice && (
        <div className="lp-choice">
          <div className="glow" />
          <div className="k"><Layers size={15} /> Time to specialize</div>
          <div className="t">Choose your {trackLabel} to continue</div>
          <div className="d">From here on, your journey includes hands-on, video-led lessons for the tool you pick. Neutral lessons stay the same for everyone.</div>
          <button className="go" onClick={onOpenPicker}>Choose your {trackLabel} <ArrowRight size={16} /></button>
        </div>
      )}

      {next && !needsChoice && (
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
        const locked = !unlocked(pi);
        const done = phaseDone(pi);
        const trackLock = locked && requiresTrack(pi) && !chosenTrack && (pi === 0 || phaseDone(pi - 1));
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
            {trackLock ? (
              <button className="lp-tracklock" onClick={onOpenPicker}>
                <Layers size={15} /> Choose your {trackLabel} to unlock this phase
              </button>
            ) : (
              <div className="lp-track">
                {ph.modules.map((m) => {
                  const md = completed.has(m.code);
                  const isTrack = !!m.track;
                  return (
                    <button key={m.code} className="lp-mod" disabled={locked} onClick={() => onOpen(m.code)}>
                      <div className="lp-mtick" style={{ background: md ? 'var(--foundation)' : isTrack ? 'var(--track-soft)' : 'var(--' + (m.layer || 'craft') + '-soft)', color: md ? '#fff' : isTrack ? 'var(--track)' : 'var(--' + (m.layer || 'craft') + ')' }}>
                        {md ? <CheckCircle2 size={17} /> : locked ? <Lock size={15} /> : isTrack ? <Play size={15} /> : layerIcon(m.layer)}
                      </div>
                      <div className="lp-mbody">
                        <div className="lp-mtitle">{m.title}</div>
                        <div className="lp-mmeta">
                          {isTrack
                            ? <span className="lp-tag track">{trackLabelText || trackLabel}</span>
                            : (m.layer && <span className={'lp-tag ' + m.layer}>{m.layer}</span>)}
                          {m.has_video && <span className="lp-vdot"><Play size={10} /> video</span>}
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
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Lesson ---------------- */
function Lesson({ mod, bodyData, loading, glossary, onTerm, onBack, isDone, onToggle, work, onWork, onWorkSave, trackLabelText }) {
  const body = bodyData?.body_md;
  const deliverable = bodyData?.deliverable ?? mod.deliverable;
  const track = bodyData?.track ?? mod.track;
  const provider = bodyData?.video_provider;
  const videoId = bodyData?.video_id;
  const isTrack = !!track;
  const eyebrowColor = isTrack ? 'var(--track)' : 'var(--' + (mod.layer || 'craft') + ')';
  return (
    <div className="lp-screen">
      <button className="lp-back" onClick={onBack}><ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} /> Journey</button>
      <div className="lp-lhead">
        <div className="lp-eyebrow" style={{ color: eyebrowColor }}>
          {isTrack ? <>{trackLabelText || 'Platform'} · hands-on</> : <>{mod.phaseN != null ? 'Phase ' + mod.phaseN + ' · ' : ''}{mod.mode || ''}</>}
          {mod.est_min ? ' · ' + mod.est_min + ' min' : ''}
        </div>
        <h1 className="lp-h1" style={{ fontSize: 27 }}>{mod.title}</h1>
      </div>

      {/* Platform lessons lead with the video (you can't learn where-to-click from prose). */}
      {isTrack && (provider || !body) && (
        <VideoBlock provider={provider} id={videoId} title={mod.title} kind="primary" watchLabel={'Watch — build it in ' + (trackLabelText || 'your platform')} />
      )}

      {loading ? (
        <div className="lp-center"><Loader2 size={22} className="spin" /></div>
      ) : body ? (
        <Markdown text={body} glossary={glossary} onTerm={onTerm} />
      ) : (
        <>
          {mod.blurb && <div className="lp-ov"><h4>In this lesson</h4><p style={{ fontSize: 15.5, lineHeight: 1.55 }}>{mod.blurb}</p></div>}
          {!isTrack && <div className="lp-note">This lesson has no body yet — an admin can add its content.</div>}
        </>
      )}

      {/* Neutral (thinking) lessons stay text-led; a video, if present, supports the reading. */}
      {!isTrack && provider && videoId && (
        <VideoBlock provider={provider} id={videoId} title={mod.title} kind="support" watchLabel="Watch it in action" />
      )}

      {deliverable && (
        <div className="lp-cap">
          <div className="ct"><PenLine size={18} color={isTrack ? 'var(--track)' : 'var(--accent)'} /> {isTrack ? 'Prove you built it' : 'Your deliverable'}</div>
          <div className="cd">{deliverable}</div>
          <textarea placeholder={isTrack ? 'Paste a link or screenshot URL of what you built…' : 'Capture your work here — saved to your portfolio…'} value={work || ''} onChange={(e) => onWork(e.target.value)} onBlur={onWorkSave} />
          {work && work.trim() && <div className="saved"><CheckCircle2 size={14} /> Saved to your work</div>}
        </div>
      )}

      <button className={'lp-btn' + (isTrack ? ' track' : '') + (isDone ? ' done' : '')} onClick={onToggle} style={{ marginTop: 14 }}>
        {isDone ? <><CheckCircle2 size={18} /> {isTrack ? 'Built' : 'Completed'} — tap to undo</> : <>{isTrack ? 'Mark built' : 'Mark lesson complete'} <ArrowRight size={18} /></>}
      </button>
    </div>
  );
}

/* ---------------- Work ---------------- */
function Work({ items, work, onOpen, trackMap }) {
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
          <div key={m.code} className="lp-wcard" onClick={() => onOpen(m.code)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {m.track
                ? <span className="lp-tag track">{trackMap[m.track] || m.track}</span>
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
function You({ name, doneCount, total, streak, gatesMet, phasesCount, isAdmin, onSignOut, chosenTrack, trackLabel, trackLabelText, onOpenPicker }) {
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

      <button className="lp-platrow" onClick={onOpenPicker}>
        <div className="ic"><Layers size={18} /></div>
        <div style={{ flex: 1 }}>
          <div className="l">Your {trackLabel}</div>
          <div className="v">{chosenTrack ? (trackLabelText || chosenTrack) : 'Not chosen yet'}</div>
        </div>
        <span className="ch">{chosenTrack ? 'Change' : 'Choose'}</span>
      </button>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isAdmin && <button className="lp-btn" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={() => router.push('/admin')}><Settings size={17} /> Admin</button>}
        <button className="lp-btn" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={onSignOut}><LogOut size={17} /> Sign out</button>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function StudentApp({
  userId, skillId, name, isAdmin, skill, phases, glossary,
  tracks, chosenTrack, trackLabel, trackChoicePhase,
  initialCompleted, initialWork, workMeta,
}) {
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const trackMap = useMemo(() => Object.fromEntries((tracks || []).map((t) => [t.track, t.label])), [tracks]);
  const trackLabelText = chosenTrack ? (trackMap[chosenTrack] || chosenTrack) : null;

  const flat = useMemo(() => phases.flatMap((p) => p.modules.map((m) => ({ ...m, phaseN: p.number }))), [phases]);
  const total = flat.length;
  const doneCount = useMemo(() => flat.filter((m) => completed.has(m.code)).length, [flat, completed]);

  const hasTracks = (tracks || []).length > 0;   // no platforms declared ⇒ never gate on a choice
  const choicePi = useMemo(() => phases.findIndex((p) => p.number >= trackChoicePhase), [phases, trackChoicePhase]);
  const requiresTrack = (pi) => hasTracks && choicePi !== -1 && pi >= choicePi;
  const phaseDone = (pi) => phases[pi].modules.length > 0 && phases[pi].modules.every((m) => completed.has(m.code));
  const unlocked = (pi) => {
    if (pi > 0 && !phaseDone(pi - 1)) return false;
    if (requiresTrack(pi) && !chosenTrack) return false;
    return true;
  };
  const choiceReached = choicePi !== -1 && (choicePi === 0 || (phases[choicePi - 1] && phaseDone(choicePi - 1)));
  const needsChoice = hasTracks && !chosenTrack && choiceReached;
  const gatesMet = phases.filter((p, pi) => phaseDone(pi)).length;

  const next = useMemo(() => {
    for (let pi = 0; pi < phases.length; pi++) {
      if (pi > 0 && !phaseDone(pi - 1)) break;
      if (requiresTrack(pi) && !chosenTrack) break;
      const m = phases[pi].modules.find((mm) => !completed.has(mm.code));
      if (m) return m;
    }
    return null;
  }, [completed, phases, chosenTrack, choicePi]);

  // The lesson currently open — from the journey if visible, else a lightweight
  // record from the fetched body (so portfolio work from any track opens cleanly).
  const curFromFlat = code ? flat.find((m) => m.code === code) : null;
  const curMeta = curFromFlat
    || (code && bodies[code] ? { code, title: bodies[code].title || code, layer: bodies[code].layer, track: bodies[code].track, mode: bodies[code].mode, est_min: bodies[code].est_min, phaseN: null } : null);

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
      const { data } = await sb.from('lessons').select('body_md,deliverable,mode,est_min,title,layer,track,video_provider,video_id').eq('code', c).single();
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

  async function choose(t) {
    setSwitching(true);
    try { await setEnrollment(sb, userId, skillId, t); } catch {}
    setPickerOpen(false);
    router.refresh();                 // server re-slices the journey to the new track
    setTimeout(() => setSwitching(false), 1500);
  }

  async function signOut() { await sb.auth.signOut(); router.push('/login'); router.refresh(); }

  // Portfolio spans every captured deliverable, across tracks (using server work meta).
  const workItems = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of flat) { seen.add(m.code); out.push({ code: m.code, title: m.title, layer: m.layer, track: m.track }); }
    for (const c of Object.keys(work || {})) {
      if (seen.has(c)) continue;
      const meta = (workMeta && workMeta[c]) || {};
      out.push({ code: c, title: meta.title || c, layer: meta.layer, track: meta.track });
    }
    return out;
  }, [flat, work, workMeta]);

  return (
    <div className="lp" data-theme={theme}>
      <div className="lp-app">
        <div className="lp-top">
          <div className="lp-brand"><span className="dot"><GraduationCap size={16} /></span> Craftpath</div>
          <div className="lp-spacer" />
          <span className="lp-chip"><Flame size={14} /> {streak}</span>
          <button className="lp-iconbtn" onClick={toggleTheme}>{theme === 'bright' ? <Moon size={17} /> : <Sun size={17} />}</button>
        </div>

        {view === 'journey' && (
          <Journey
            skill={skill} phases={phases} completed={completed} unlocked={unlocked} phaseDone={phaseDone} requiresTrack={requiresTrack}
            next={next} onOpen={open} onContinue={() => next && open(next.code)} streak={streak} doneCount={doneCount} total={total}
            chosenTrack={chosenTrack} trackLabel={trackLabel} trackLabelText={trackLabelText} needsChoice={needsChoice}
            onOpenPicker={() => setPickerOpen(true)}
          />
        )}
        {view === 'lesson' && curMeta && (
          <Lesson
            mod={curMeta} bodyData={bodies[curMeta.code]} loading={loadingBody} glossary={glossary} onTerm={setSheet}
            onBack={() => setView('journey')} isDone={completed.has(curMeta.code)} onToggle={() => toggleComplete(curMeta.code)}
            work={work[curMeta.code]} onWork={(v) => updateWork(curMeta.code, v)} onWorkSave={() => persistWork(curMeta.code)}
            trackLabelText={curMeta.track ? (trackMap[curMeta.track] || curMeta.track) : null}
          />
        )}
        {view === 'work' && <Work items={workItems} work={work} onOpen={open} trackMap={trackMap} />}
        {view === 'you' && (
          <You name={name} doneCount={doneCount} total={total} streak={streak} gatesMet={gatesMet} phasesCount={phases.length} isAdmin={isAdmin} onSignOut={signOut}
            chosenTrack={chosenTrack} trackLabel={trackLabel} trackLabelText={trackLabelText} onOpenPicker={() => setPickerOpen(true)} />
        )}
      </div>

      <div className="lp-nav">
        <button className={'lp-navbtn' + (view === 'journey' ? ' on' : '')} onClick={() => setView('journey')}><Compass size={21} />Journey</button>
        <button className={'lp-navbtn' + (view === 'work' ? ' on' : '')} onClick={() => setView('work')}><BookOpen size={21} />Work</button>
        <button className={'lp-navbtn' + (view === 'you' ? ' on' : '')} onClick={() => setView('you')}><User size={21} />You</button>
      </div>

      {pickerOpen && (
        <Picker tracks={tracks || []} trackLabel={trackLabel} current={chosenTrack} busy={switching}
          onPick={choose} onClose={() => setPickerOpen(false)} />
      )}
      {sheet && <GlossarySheet term={sheet} glossary={glossary} onClose={() => setSheet(null)} />}
    </div>
  );
}
