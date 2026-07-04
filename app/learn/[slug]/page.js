import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser, getProfile } from '@/lib/auth';
import { getSkillJourney, getGlossaryMap, getUserProgress, getUserDeliverables } from '@/lib/content';
import StudentApp from './StudentApp';

export default async function SkillJourney({ params }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/learn/' + params.slug);
  const sb = createClient();
  const journey = await getSkillJourney(sb, params.slug);
  if (!journey) notFound();
  const profile = await getProfile();
  const [glossary, completed, work] = await Promise.all([
    getGlossaryMap(sb),
    getUserProgress(sb, user.id),
    getUserDeliverables(sb, user.id),
  ]);
  return (
    <StudentApp
      userId={user.id}
      name={profile?.display_name || (user.email || '').split('@')[0]}
      isAdmin={!!profile?.is_admin}
      skill={journey.skill}
      phases={journey.phases}
      glossary={glossary}
      initialCompleted={completed}
      initialWork={work}
    />
  );
}

export const dynamic = 'force-dynamic';
