import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import AuthLayout from '../auth/AuthLayout';
import { navigate } from '../lib/router';

export default function SignUpPage() {
  const { signUp, signOut, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError(
        'Firebase is not configured. Add the VITE_FIREBASE_* variables to frontend/.env.'
      );
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
      await signOut();
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message ?? 'Sign up failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign up"
      subtitle="Create an account to use ClauseVerifyer AI. You will sign in on the next step."
      footer={
        <span className="text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            className="font-medium text-brand-light hover:underline"
            onClick={() => navigate('/login')}
          >
            Sign in
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium text-gray-400">
            Email
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium text-gray-400">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="mb-1.5 block text-xs font-medium text-gray-400">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="Repeat password"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-risk-critical/40 bg-risk-critical/10 px-3 py-2 text-sm text-risk-critical">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
