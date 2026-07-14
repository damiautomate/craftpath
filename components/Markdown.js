'use client';
import { useMemo } from 'react';
import { X, BookOpen } from 'lucide-react';

const MODE_EMOJI = ['🎬', '🪞', '✅', '🚀', '✍️', '📚', '📌', '🎯'];
const isMode = (t) => MODE_EMOJI.some((e) => t.startsWith(e));

const ytId = (s) => {
  const str = String(s || '');
  const m = str.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(str) ? str : null;
};

// pipe-table helpers
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isSepRow = (l) => {
  if (!l || l.indexOf('|') === -1) return false;
  const cells = splitRow(l);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
};

function videoBlockFor(line) {
  if (/\[placeholder/i.test(line)) {
    const q = line.match(/"([^"]+)"|[\u201C]([^\u201D]+)[\u201D]/);
    return { t: 'videosoon', title: (q && (q[1] || q[2])) || null };
  }
  const s0 = line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^[\u25B6\u25BA\u25B7\uFE0F\u2018\u2019\s►▶️🎬📺]+/gu, '')
    .replace(/^watch[:\-\s]*/i, '')
    .trim();
  const mark = s0.match(/^@video\s+(\S+)$/i);
  const linkOnly = s0.match(/^(?:\[[^\]]*\]\()?\s*(https?:\/\/[^\s)]+)\)?$/);
  let id = null;
  if (mark) id = ytId(mark[1]);
  else if (linkOnly && /(youtube\.com|youtu\.be)/i.test(linkOnly[1])) id = ytId(linkOnly[1]);
  return id ? { t: 'video', id } : null;
}

function parseBlocks(md) {
  const lines = (md || '').split('\n');
  const blocks = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    const vb = videoBlockFor(line);
    if (vb) { blocks.push(vb); i++; continue; }
    if (line.startsWith('### ')) { blocks.push({ t: 'h3', x: line.slice(4) }); i++; continue; }
    if (line.startsWith('## ')) { blocks.push({ t: 'h2', x: line.slice(3) }); i++; continue; }
    if (line.startsWith('# ')) { blocks.push({ t: 'h1', x: line.slice(2) }); i++; continue; }
    if (/^---+$/.test(line.trim())) { blocks.push({ t: 'hr' }); i++; continue; }
    // pipe table: a row starting with | followed by a |---|---| separator
    if (line.trim().startsWith('|') && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      const head = splitRow(line); const body = []; let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith('|') && !isSepRow(lines[j])) { body.push(splitRow(lines[j])); j++; }
      blocks.push({ t: 'table', head, body }); i = j; continue;
    }
    if (line.startsWith('>')) {
      const q = []; while (i < lines.length && lines[i].startsWith('>')) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ t: 'quote', items: q.filter((s) => s.trim()) }); continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = []; while (i < lines.length && /^\s*-\s+/.test(lines[i]) && !videoBlockFor(lines[i])) { items.push(lines[i].replace(/^\s*-\s+/, '')); i++; }
      if (items.length) { blocks.push({ t: 'ul', items }); continue; }
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push({ t: 'ol', items }); continue;
    }
    const para = [line]; i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*\|/.test(lines[i]) && !/^(#|>|\s*-\s|\s*\d+\.\s|---)/.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push({ t: 'p', x: para.join(' ') });
  }
  return blocks;
}

function inline(text, ctx, kp) {
  const nodes = [];
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  parts.forEach((part, i) => {
    if (!part) return;
    if (/^`[^`]+`$/.test(part)) { nodes.push(<code key={kp + 'c' + i}>{part.slice(1, -1)}</code>); return; }
    const lm = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lm) {
      const external = /^https?:\/\//.test(lm[2]);
      nodes.push(<a key={kp + 'a' + i} className="lp-link" href={lm[2]} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{lm[1]}</a>);
      return;
    }
    if (/^\*\*[\s\S]+\*\*$/.test(part)) { nodes.push(<strong key={kp + 'b' + i}>{part.slice(2, -2)}</strong>); return; }
    if (/^\*[\s\S]+\*$/.test(part)) { nodes.push(<em key={kp + 'i' + i}>{part.slice(1, -1)}</em>); return; }
    if (!ctx.g) { nodes.push(part); return; }
    const re = /([A-Za-z][A-Za-z-]*)/g; let last = 0, m, k = 0;
    while ((m = re.exec(part))) {
      const w = m[1], lw = w.toLowerCase();
      if (ctx.g[lw] && !ctx.used.has(lw)) {
        ctx.used.add(lw);
        if (m.index > last) nodes.push(part.slice(last, m.index));
        nodes.push(<span key={kp + 't' + i + '-' + (k++)} className="lp-term" onClick={() => ctx.onTerm && ctx.onTerm(lw)}>{w}</span>);
        last = m.index + w.length;
      }
    }
    if (last < part.length) nodes.push(part.slice(last));
  });
  return nodes;
}

function VideoEmbed({ id }) {
  return (
    <div className="lp-md-video">
      <div className="cp-video">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title="Lesson video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}

function block(b, i, ctx) {
  const kp = 'k' + i + '-';
  if (b.t === 'h1') return <h1 key={i}>{inline(b.x, ctx, kp)}</h1>;
  if (b.t === 'h2') return <h2 key={i} className={isMode(b.x) ? 'mode' : ''}>{inline(b.x, ctx, kp)}</h2>;
  if (b.t === 'h3') return <h3 key={i}>{inline(b.x, ctx, kp)}</h3>;
  if (b.t === 'hr') return <hr key={i} />;
  if (b.t === 'video') return <VideoEmbed key={i} id={b.id} />;
  if (b.t === 'videosoon') return (
    <div key={i} className="lp-md-soon">
      <span className="ic">🎬</span>
      <span>Walkthrough video coming soon{b.title ? <> — <em>“{b.title}”</em></> : null}</span>
    </div>
  );
  if (b.t === 'table') return (
    <div key={i} className="lp-md-tablewrap">
      <table>
        <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, ctx, kp + 'h' + j)}</th>)}</tr></thead>
        <tbody>{b.body.map((row, r) => <tr key={r}>{b.head.map((_, j) => <td key={j}>{inline(row[j] || '', ctx, kp + r + '-' + j)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  if (b.t === 'p') return <p key={i}>{inline(b.x, ctx, kp)}</p>;
  if (b.t === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, ctx, kp + j)}</li>)}</ul>;
  if (b.t === 'ol') return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, ctx, kp + j)}</li>)}</ol>;
  if (b.t === 'quote') return <blockquote key={i}>{b.items.map((it, j) => <p key={j} style={{ margin: '4px 0' }}>{inline(it, ctx, kp + j)}</p>)}</blockquote>;
  return null;
}

export function Markdown({ text, glossary, onTerm }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  const ctx = { g: glossary || null, used: new Set(), onTerm };
  return <div className="lp-md">{blocks.map((b, i) => block(b, i, ctx))}</div>;
}

export function GlossarySheet({ term, glossary, onClose }) {
  const g = glossary && glossary[term];
  if (!g) return null;
  return (
    <div className="lp-sheet-wrap" onClick={onClose}>
      <div className="lp-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="term">{g.term || term}</div>
            <div className="def">{g.def}</div>
            {g.primer && <span className="pill"><BookOpen size={13} /> Primer {g.primer}</span>}
          </div>
          <button className="lp-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
    </div>
  );
}
