import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

function mapFirebaseError(err) {
  if (!err?.code) return err?.message ?? 'Something went wrong.';
  const map = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-credential':
      'Invalid email or password.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[err.code] ?? err.message ?? 'Authentication failed.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      throw new Error(mapFirebaseError(e));
    }
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      throw new Error(mapFirebaseError(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      configured: isFirebaseConfigured,
    }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
