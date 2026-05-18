import { useEffect, useSyncExternalStore } from 'react';
import App from './App.jsx';
import LandingPage from './LandingPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import AdminApp from './pages/admin/AdminApp.jsx';
import { useAuth } from './auth/AuthContext';
import { getPath, navigate, subscribePath } from './lib/router';

function usePathname() {
  return useSyncExternalStore(subscribePath, getPath, getPath);
}

function ProtectedApp() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/app')}`);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-gray-500">
        Redirecting to sign in…
      </div>
    );
  }

  return <App />;
}

function ProtectedAdmin() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/admin')}`);
      return;
    }
    if (user.role !== 'admin') {
      navigate('/app');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-gray-500">
        Redirecting…
      </div>
    );
  }

  return <AdminApp />;
}

export default function RoutesRoot() {
  const path = usePathname();
  const normalized = path.replace(/\/+$/, '') || '/';

  if (normalized === '/login') return <SignInPage />;
  if (normalized === '/signup') return <SignUpPage />;
  if (normalized === '/app') return <ProtectedApp />;
  if (normalized === '/admin') return <ProtectedAdmin />;
  return <LandingPage />;
}
