import { createClient } from '@/lib/supabase/server';
import { getLesson, getGlossaryMap } from '@/lib/content';
import LessonEditor from './LessonEditor';

export default async function EditLesson({ params }) {
  const sb = createClient();
  const code = decodeURIComponent(params.code);
  const lesson = await getLesson(sb, code);
  const glossary = await getGlossaryMap(sb);
  if (!lesson) return <div className="adm-pad"><h1 className="adm-h1">Not found</h1><p className="adm-sub">No lesson with code {code}.</p></div>;
  return <LessonEditor lesson={lesson} glossary={glossary} />;
}

export const dynamic = 'force-dynamic';
