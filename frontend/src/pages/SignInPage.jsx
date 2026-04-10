import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import AuthLayout from '../auth/AuthLayout';
import { navigate } from '../lib/router';

function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app';
  return next;
}

export default function SignInPage() {
  const { signIn, user, loading, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const registered = new URLSearchParams(window.location.search).get('registered') === '1';

  useEffect(() => {
    if (loading || !user) return;
    navigate(safeNext());
  }, [loading, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError(
        'Firebase is not configured. Add the VITE_FIREBASE_* variables to frontend/.env (see project README or Firebase setup).'
      );
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(safeNext());
    } catch (err) {
      setError(err.message ?? 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to open the analyzer and review documents."
      footer={
        <span className="text-gray-400">
          No account?{' '}
          <button
            type="button"
            className="font-medium text-brand-light hover:underline"
            onClick={() => navigate('/signup')}
          >
            Sign up
          </button>
        </span>
      }
    >
      {!configured && (
        <p className="mb-4 rounded-lg border border-risk-medium/40 bg-risk-medium/10 px-3 py-2 text-sm text-risk-medium">
          Firebase env vars are missing. Copy{' '}
          <code className="font-mono text-xs">.env.example</code> to{' '}
          <code className="font-mono text-xs">.env</code> and fill in your Firebase web app config.
        </p>
      )}

      {registered && (
        <p className="mb-4 rounded-lg border border-risk-low/40 bg-risk-low/10 px-3 py-2 text-sm text-risk-low">
          Account created. Sign in with your email and password to continue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-xs font-medium text-gray-400">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="mb-1.5 block text-xs font-medium text-gray-400">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-risk-critical/40 bg-risk-critical/10 px-3 py-2 text-sm text-risk-critical">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
