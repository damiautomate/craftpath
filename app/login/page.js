import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth"><div className="authcard">Loading…</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
