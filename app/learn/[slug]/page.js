import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser, getProfile } from '@/lib/auth';
import {
  getSkill, getSkillJourney, getSkillTracks, getEnrollment,
  getGlossaryMap, getUserProgress, getUserDeliverables, getUserWorkMeta,
} from '@/lib/content';
import StudentApp from './StudentApp';

export default async function SkillJourney({ params }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/learn/' + params.slug);
  const sb = createClient();

  const skill = await getSkill(sb, params.slug);
  if (!skill) notFound();

  // Which platform this student is on (null until they choose) → the journey is sliced to it.
  const track = await getEnrollment(sb, user.id, skill.id);

  const profile = await getProfile();
  const [journey, tracks, glossary, completed, work, workMeta] = await Promise.all([
    getSkillJourney(sb, params.slug, track),
    getSkillTracks(sb, skill.id),
    getGlossaryMap(sb),
    getUserProgress(sb, user.id),
    getUserDeliverables(sb, user.id),
    getUserWorkMeta(sb, user.id),
  ]);
  if (!journey) notFound();

  return (
    <StudentApp
      userId={user.id}
      skillId={skill.id}
      name={profile?.display_name || (user.email || '').split('@')[0]}
      isAdmin={!!profile?.is_admin}
      skill={journey.skill}
      phases={journey.phases}
      glossary={glossary}
      tracks={tracks}
      chosenTrack={track}
      trackLabel={skill.track_label || 'platform'}
      trackChoicePhase={skill.track_choice_phase ?? 1}
      initialCompleted={completed}
      initialWork={work}
      workMeta={workMeta}
    />
  );
}

export const dynamic = 'force-dynamic';
