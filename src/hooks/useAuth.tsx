import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserPlan = 'normal' | 'pro';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  plan: UserPlan;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (u: AuthUser) => void;
  logout: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    plan: 'normal',   // will be overridden by refreshUser
    avatarUrl: null,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((u: AuthUser) => setUser(u), []);
  const logout = useCallback(() => setUser(null), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
  }, [logout]);

  // Load extra profile fields (plan, avatarUrl) from user_profiles
  const loadProfile = useCallback(async (base: AuthUser): Promise<AuthUser> => {
    const { data } = await supabase
      .from('user_profiles')
      .select('plan, avatar_url, username')
      .eq('id', base.id)
      .single();
    if (!data) return base;
    return {
      ...base,
      plan: (data.plan as UserPlan) || 'normal',
      avatarUrl: data.avatar_url ?? null,
      username: data.username || base.username,
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const base = mapSupabaseUser(session.user);
    const full = await loadProfile(base);
    setUser(full);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const base = mapSupabaseUser(session.user);
        const full = await loadProfile(base);
        if (mounted) login(full);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        const base = mapSupabaseUser(session.user);
        const full = await loadProfile(base);
        if (mounted) { login(full); setLoading(false); }
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const base = mapSupabaseUser(session.user);
        const full = await loadProfile(base);
        if (mounted) login(full);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
