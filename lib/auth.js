import { createClient } from './supabase/server';

export async function getUser() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function getProfile() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return data ? { ...data, email: user.email } : { id: user.id, email: user.email, is_admin: false };
}
