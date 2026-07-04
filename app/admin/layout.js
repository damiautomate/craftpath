import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { LayoutDashboard, Upload, BookOpen, Layers, BookMarked, LogOut } from 'lucide-react';
import SignOut from './SignOut';

export default async function AdminLayout({ children }) {
  const profile = await getProfile();
  if (!profile || !profile.id) redirect('/login?next=/admin');
  if (!profile.is_admin) {
    return (
      <div className="placeholder"><div className="box">
        <h2>Not authorized</h2>
        <p>Your account (<b>{profile.email}</b>) isn&apos;t an admin. Run the SQL in the README to grant admin, then reload.</p>
        <div style={{ marginTop: 16 }}><SignOut /></div>
      </div></div>
    );
  }
  const nav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/import', label: 'Import', icon: Upload },
    { href: '/admin/lessons', label: 'Lessons', icon: BookOpen },
    { href: '/admin/skills', label: 'Skills', icon: Layers },
    { href: '/admin/glossary', label: 'Glossary', icon: BookMarked },
  ];
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">Craftpath <span>admin</span></div>
        <nav>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="adm-link"><n.icon size={17} /> {n.label}</Link>
          ))}
        </nav>
        <div className="adm-foot"><SignOut /></div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
