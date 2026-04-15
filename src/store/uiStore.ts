import { create } from 'zustand';
import type { ToastMessage, ToastTone } from '../types/domain';

interface UiState {
  toasts: ToastMessage[];
  pushToast: (input: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (input) =>
    set((state) => ({
      toasts: [...state.toasts, { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function pushToast(tone: ToastTone, title: string, description?: string) {
  useUiStore.getState().pushToast({ tone, title, description });
}
