import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseGlossary } from '@/lib/parser';

export async function POST(req) {
  const p = await getProfile();
  if (!p || !p.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  try {
    const { content } = await req.json();
    const terms = parseGlossary(content);
    if (!terms.length) return NextResponse.json({ error: 'No terms found in file.' }, { status: 400 });
    const sb = createAdminClient();
    const { error } = await sb.from('glossary_terms').upsert(terms, { onConflict: 'term' });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, terms: terms.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
