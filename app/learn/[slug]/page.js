import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser, getProfile } from '@/lib/auth';
import { getSkillJourney, getGlossaryMap, getUserProgress, getUserDeliverables, getBranches } from '@/lib/content';
import StudentApp from './StudentApp';

export default async function SkillJourney({ params }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/learn/' + params.slug);
  const sb = createClient();
  const journey = await getSkillJourney(sb, params.slug);
  if (!journey) notFound();
  const profile = await getProfile();

  // The pilot runs one platform track. `branch_platform` can later come from the
  // skill manifest; until then it defaults to 'ghl'. Adding a second track is when
  // a platform picker gets built.
  const platform = journey.skill.branch_platform || 'ghl';

  const [glossary, completed, work, branches] = await Promise.all([
    getGlossaryMap(sb),
    getUserProgress(sb, user.id),
    getUserDeliverables(sb, user.id),
    getBranches(sb, platform),
  ]);
  return (
    <StudentApp
      userId={user.id}
      name={profile?.display_name || (user.email || '').split('@')[0]}
      isAdmin={!!profile?.is_admin}
      skill={journey.skill}
      phases={journey.phases}
      glossary={glossary}
      branches={branches}
      initialCompleted={completed}
      initialWork={work}
    />
  );
}

export const dynamic = 'force-dynamic';
