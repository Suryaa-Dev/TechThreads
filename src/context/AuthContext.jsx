import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { getProfile, invalidateProfile } from '../services/userService';

export const AuthContext = createContext(null);

// ── Read session instantly (no network) ─────────────────────────────
function readStoredSession() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL ?? '';
    const projectRef = url.replace('https://', '').split('.')[0];
    const key = `sb-${projectRef}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const storedUser = readStoredSession();

  const [user, setUser] = useState(storedUser);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!storedUser);

  const profileLoaded = useRef(false);
  const loadingProfile = useRef(false);
  const mountedRef = useRef(true);

  // ── Safe profile loader (NO duplicates) ───────────────────────────
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser?.id) {
      setProfile(null);
      return;
    }

    if (loadingProfile.current) return; // 🚫 prevent parallel calls
    loadingProfile.current = true;

    try {
      const data = await getProfile(authUser.id);
      if (mountedRef.current) {
        setProfile(data ?? null);
      }
    } catch (err) {
      console.error('[Auth] loadProfile error:', err.message);
      if (mountedRef.current) {
        setProfile(null);
      }
    } finally {
      loadingProfile.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null;

        if (!mountedRef.current) return;

        if (event === 'INITIAL_SESSION') {
          setUser(nextUser);

          if (!profileLoaded.current) {
            profileLoaded.current = true;
            await loadProfile(nextUser);
          }

          setLoading(false);

        } else if (event === 'SIGNED_IN') {
          setUser(nextUser);

          // 🚫 prevent duplicate load (already handled in INITIAL_SESSION)
          if (!profileLoaded.current) {
            profileLoaded.current = true;
            invalidateProfile(nextUser?.id);
            await loadProfile(nextUser);
          }

          setLoading(false);

        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          profileLoaded.current = false;
          setLoading(false);

        } else if (event === 'TOKEN_REFRESHED') {
          setUser(nextUser);

        } else if (event === 'USER_UPDATED') {
          setUser(nextUser);
          invalidateProfile(nextUser?.id);
          await loadProfile(nextUser);
        }
      }
    );

    // ⚡ Fast UI load (from localStorage)
    if (storedUser && !profileLoaded.current) {
      profileLoaded.current = true;
      loadProfile(storedUser);
    }

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Sign out ─────────────────────────────────────────────────────
  const signOut = async () => {
    profileLoaded.current = false;
    await supabase.auth.signOut();
  };

  // ── Manual refresh ───────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    invalidateProfile(user.id);
    await loadProfile(user);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}