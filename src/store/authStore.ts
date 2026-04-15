import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { signOutCurrentUser } from '../services/auth';
import { fetchCurrentUserProfile, isOnboardingCompleteFromAnswers } from '../services/profile';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import type { UserProfile } from '../types/domain';
import { pushToast } from './uiStore';

interface AuthState {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isOnboarded: boolean;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUserProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
}

let isListenerBound = false;

async function hydrateFromSession(session: Session | null, set: (partial: Partial<AuthState>) => void) {
  if (!session?.user) {
    set({ session: null, user: null, isOnboarded: false, isLoading: false, isBootstrapping: false });
    return;
  }

  try {
    const profile = await fetchCurrentUserProfile(session.user.id);
    set({
      session,
      user: profile,
      isOnboarded: profile ? isOnboardingCompleteFromAnswers(profile.answers) : false,
      isLoading: false,
      isBootstrapping: false,
    });
  } catch (error) {
    console.error(error);
    pushToast('error', '账户同步失败', '请稍后刷新重试。');
    set({ session, user: null, isOnboarded: false, isLoading: false, isBootstrapping: false });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isBootstrapping: true,
  isOnboarded: false,
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false, isBootstrapping: false });
      return;
    }

    set({ isLoading: true, isBootstrapping: true });
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await hydrateFromSession(session, set);

    if (!isListenerBound) {
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        set({ isLoading: true });
        void hydrateFromSession(nextSession, set);
      });
      isListenerBound = true;
    }
  },
  refreshProfile: async () => {
    const session = get().session;
    if (!session?.user) return;
    const profile = await fetchCurrentUserProfile(session.user.id);
    set({ user: profile, isOnboarded: profile ? isOnboardingCompleteFromAnswers(profile.answers) : false });
  },
  setUserProfile: (profile) => {
    set({ user: profile, isOnboarded: profile ? isOnboardingCompleteFromAnswers(profile.answers) : false });
  },
  signOut: async () => {
    await signOutCurrentUser();
    set({ session: null, user: null, isOnboarded: false });
  },
}));
