import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
} from '../services/api.js';

const AuthContext = createContext(null);

function mapAuthError(message) {
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('already registered')) return 'This email is already registered.';
  if (lower.includes('invalid email or password')) return 'Invalid email or password.';
  if (lower.includes('not authenticated')) return 'Please sign in again.';
  if (lower.includes('invalid or expired token')) {
    return 'Your session expired. Please sign in again.';
  }
  return message ?? 'Authentication failed.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const signIn = useCallback(async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);
    } catch (e) {
      throw new Error(mapAuthError(e.message));
    }
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    try {
      await apiSignup(name, email, password);
    } catch (e) {
      throw new Error(mapAuthError(e.message));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* cookie may already be cleared */
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      configured: true,
      refreshUser,
    }),
    [user, loading, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
