import { create } from 'zustand';
import { getContactShareSummaries } from '../services/contactShares';
import type { ContactShareSummary } from '../types/domain';
import { pushToast } from './uiStore';

interface ContactShareState {
  summaryMap: Record<string, ContactShareSummary>;
  pendingApprovalCount: number;
  isLoading: boolean;
  fetchSummaries: () => Promise<void>;
  reset: () => void;
}

export const useContactShareStore = create<ContactShareState>((set) => ({
  summaryMap: {},
  pendingApprovalCount: 0,
  isLoading: false,
  fetchSummaries: async () => {
    set({ isLoading: true });
    try {
      const summaryMap = await getContactShareSummaries();
      const pendingApprovalCount = Object.values(summaryMap).filter((summary) => summary.partnerIsShared && !summary.myIsShared).length;
      set({ summaryMap, pendingApprovalCount, isLoading: false });
    } catch (error) {
      console.error(error);
      pushToast('error', '联系方式状态加载失败', '请稍后再试。');
      set({ isLoading: false });
    }
  },
  reset: () => set({ summaryMap: {}, pendingApprovalCount: 0, isLoading: false }),
}));

