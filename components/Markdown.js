'use client';
import { useMemo } from 'react';
import { X, BookOpen } from 'lucide-react';

const MODE_EMOJI = ['🎬', '🪞', '✅', '🚀', '✍️', '📚', '📌', '🎯'];
const isMode = (t) => MODE_EMOJI.some((e) => t.startsWith(e));

function parseBlocks(md) {
  const lines = (md || '').split('\n');
  const blocks = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (line.startsWith('### ')) { blocks.push({ t: 'h3', x: line.slice(4) }); i++; continue; }
    if (line.startsWith('## ')) { blocks.push({ t: 'h2', x: line.slice(3) }); i++; continue; }
    if (line.startsWith('# ')) { blocks.push({ t: 'h1', x: line.slice(2) }); i++; continue; }
    if (/^---+$/.test(line.trim())) { blocks.push({ t: 'hr' }); i++; continue; }
    if (line.startsWith('>')) {
      const q = []; while (i < lines.length && lines[i].startsWith('>')) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ t: 'quote', items: q.filter((s) => s.trim()) }); continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = []; while (i < lines.length && /^\s*-\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*-\s+/, '')); i++; }
      blocks.push({ t: 'ul', items }); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push({ t: 'ol', items }); continue;
    }
    const para = [line]; i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|>|\s*-\s|\s*\d+\.\s|---)/.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push({ t: 'p', x: para.join(' ') });
  }
  return blocks;
}

function inline(text, ctx, kp) {
  const nodes = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  parts.forEach((part, i) => {
    if (!part) return;
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

function block(b, i, ctx) {
  const kp = 'k' + i + '-';
  if (b.t === 'h1') return <h1 key={i}>{inline(b.x, ctx, kp)}</h1>;
  if (b.t === 'h2') return <h2 key={i} className={isMode(b.x) ? 'mode' : ''}>{inline(b.x, ctx, kp)}</h2>;
  if (b.t === 'h3') return <h3 key={i}>{inline(b.x, ctx, kp)}</h3>;
  if (b.t === 'hr') return <hr key={i} />;
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
