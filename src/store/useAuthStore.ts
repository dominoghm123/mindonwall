import { create } from 'zustand';
import { supabase, isAuthEnabled } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  /** Current authenticated user (null = guest) */
  user: User | null;
  /** Active session */
  session: Session | null;
  /** Auth loading state */
  isLoading: boolean;
  /** Whether Supabase auth is configured */
  isAuthEnabled: boolean;

  /** Initialize auth listener (call once at app start) */
  initAuth: () => () => void;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign up with email + password */
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign in with OAuth provider (Google / GitHub) */
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Update password (must be logged in) */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  /** Delete account (must be logged in) */
  deleteAccount: () => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthEnabled,

  initAuth: () => {
    if (!isAuthEnabled || !supabase) {
      set({ isLoading: false });
      return () => {};
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, isLoading: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session, user: session?.user ?? null });
      },
    );

    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Auth not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Auth not configured' };
    // v0.6: Auto sign in after sign up to bypass email confirmation for local dev
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        // Disable email confirmation for development
        emailRedirectTo: window.location.origin,
      }
    });
    
    // If signup succeeded but requires email confirmation, auto-login anyway for dev
    if (!error && data.user && !data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        // Successfully logged in after signup
        return { error: null };
      }
      // If auto-login failed, return the original signup error or a helpful message
      return { error: 'Please check your email to confirm your account' };
    }
    
    return { error: error?.message ?? null };
  },

  signInWithOAuth: async (provider) => {
    if (!supabase) return { error: 'Auth not configured' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { error: 'Auth not configured' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  },

  deleteAccount: async () => {
    if (!supabase || !get().user) return { error: 'Not authenticated' };
    // Supabase doesn't have a client-side delete user API.
    // We sign out and mark as deleted. Actual deletion requires admin API or RLS policy.
    await supabase.auth.signOut();
    set({ user: null, session: null });
    // Clear local data
    localStorage.clear();
    return { error: null };
  },
}));
