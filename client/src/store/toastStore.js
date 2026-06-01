import { create } from 'zustand';

let toastTimer;

export const useToastStore = create((set) => ({
  toast: null,
  showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    set({ toast: { message, type } });
    toastTimer = setTimeout(() => set({ toast: null }), 2400);
  },
  clearToast() {
    clearTimeout(toastTimer);
    set({ toast: null });
  }
}));
