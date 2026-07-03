import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Upload, BookOpen, Layers, BookMarked } from 'lucide-react';

export default async function AdminHome() {
  const sb = createClient();
  const [lessons, skills, glossary] = await Promise.all([
    sb.from('lessons').select('*', { count: 'exact', head: true }),
    sb.from('skills').select('*', { count: 'exact', head: true }),
    sb.from('glossary_terms').select('*', { count: 'exact', head: true }),
  ]);
  const stats = [
    { label: 'Lessons', v: lessons.count || 0, href: '/admin/lessons', icon: BookOpen },
    { label: 'Skills', v: skills.count || 0, href: '/admin/skills', icon: Layers },
    { label: 'Glossary terms', v: glossary.count || 0, href: '/admin/glossary', icon: BookMarked },
  ];
  return (
    <div className="adm-pad">
      <h1 className="adm-h1">Dashboard</h1>
      <p className="adm-sub">Manage your content. Everything students see comes from here.</p>
      <div className="adm-stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="adm-stat">
            <s.icon size={18} className="ic" />
            <div className="v">{s.v}</div>
            <div className="l">{s.label}</div>
          </Link>
        ))}
      </div>
      <Link href="/admin/import" className="adm-cta"><Upload size={18} /> Import content (.md / .yaml)</Link>
    </div>
  );
}
