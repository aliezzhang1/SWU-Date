import { create } from 'zustand';
import { getDailyMatchSnapshot, getMatches } from '../services/matching';
import type { DailyMatchSnapshot, MatchWithProfile } from '../types/domain';
import { useAuthStore } from './authStore';
import { pushToast } from './uiStore';

interface MatchState {
  matches: MatchWithProfile[];
  dailySnapshot: DailyMatchSnapshot | null;
  isLoadingDaily: boolean;
  fetchDailySnapshot: () => Promise<void>;
  fetchMatches: () => Promise<void>;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  dailySnapshot: null,
  isLoadingDaily: false,
  fetchDailySnapshot: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoadingDaily: true });
    try {
      const dailySnapshot = await getDailyMatchSnapshot(user.id);
      set({ dailySnapshot, isLoadingDaily: false });
    } catch (error) {
      console.error(error);
      pushToast('error', '每日配对加载失败', error instanceof Error ? error.message : '请稍后再试。');
      set({ isLoadingDaily: false });
    }
  },
  fetchMatches: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const matches = await getMatches(user.id);
      set({ matches });
    } catch (error) {
      console.error(error);
      pushToast('error', '匹配同步失败', '稍后再试试看。');
    }
  },
}));
