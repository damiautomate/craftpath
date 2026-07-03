'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
export default function SignOut() {
  const router = useRouter();
  return (
    <button className="adm-link" onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh(); }}>
      <LogOut size={17} /> Sign out
    </button>
  );
}
