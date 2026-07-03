import { createClient as createSbClient } from '@supabase/supabase-js';

// SERVER-ONLY client using the service-role key. Bypasses RLS.
// Use ONLY inside server route handlers that have verified the caller is an admin,
// e.g. the content-import endpoints. Never import this into client code.
export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
