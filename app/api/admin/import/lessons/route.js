import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseLesson } from '@/lib/parser';

export async function POST(req) {
  const p = await getProfile();
  if (!p || !p.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items[] required' }, { status: 400 });

  const sb = createAdminClient();
  const saved = [], errors = [];
  for (const it of items) {
    try {
      const row = parseLesson(it.content);
      const { error } = await sb.from('lessons').upsert(row, { onConflict: 'code' });
      if (error) throw new Error(error.message);
      saved.push(row.code);
    } catch (e) { errors.push({ name: it.name, error: e.message }); }
  }
  return NextResponse.json({ ok: true, saved, errors });
}
