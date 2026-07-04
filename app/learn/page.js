import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getPublishedSkills } from '@/lib/content';
import { Compass } from 'lucide-react';

export default async function LearnHome() {
  const user = await getUser();
  if (!user) redirect('/login?next=/learn');
  const sb = createClient();
  const skills = await getPublishedSkills(sb);
  if (skills.length === 1) redirect('/learn/' + skills[0].slug);
  return (
    <div className="land">
      <h1>Choose a skill</h1>
      {skills.length === 0 && <p>No published skills yet. (Admins: import a skill and publish it.)</p>}
      <div className="cards">
        {skills.map((s) => (
          <Link key={s.id} className="card" href={'/learn/' + s.slug}>
            <div className="ic"><Compass size={22} /></div>
            <h3>{s.title}</h3>
            <span>{s.tagline || s.goal}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
