import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WalkthroughMode = 'showcase' | 'spotlight';

interface WalkthroughState {
  isOpen: boolean;
  mode: WalkthroughMode;
  currentStep: number;
  spotlightStep: number;
  hasSeenWalkthrough: boolean;
  showOnSignIn: boolean;

  // Actions
  openWalkthrough: (mode?: WalkthroughMode) => void;
  closeWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  setMode: (mode: WalkthroughMode) => void;
  setShowOnSignIn: (val: boolean) => void;
  markAsSeen: () => void;
  resetWalkthrough: () => void;
}

export const TOTAL_SHOWCASE_STEPS = 5;
export const TOTAL_SPOTLIGHT_STEPS = 6;

export const useWalkthroughStore = create<WalkthroughState>()(
  persist(
    (set) => ({
      isOpen: false,
      mode: 'showcase',
      currentStep: 0,
      spotlightStep: 0,
      hasSeenWalkthrough: false,
      showOnSignIn: true, // Default true: shows at every new or every time at sign-in

      openWalkthrough: (mode = 'showcase') =>
        set({ isOpen: true, mode, currentStep: 0, spotlightStep: 0 }),

      closeWalkthrough: () =>
        set({ isOpen: false, hasSeenWalkthrough: true }),

      nextStep: () =>
        set((state) => {
          if (state.mode === 'showcase') {
            const next = state.currentStep + 1;
            if (next >= TOTAL_SHOWCASE_STEPS) {
              return { isOpen: false, hasSeenWalkthrough: true, currentStep: 0 };
            }
            return { currentStep: next };
          } else {
            const next = state.spotlightStep + 1;
            if (next >= TOTAL_SPOTLIGHT_STEPS) {
              return { isOpen: false, hasSeenWalkthrough: true, spotlightStep: 0 };
            }
            return { spotlightStep: next };
          }
        }),

      prevStep: () =>
        set((state) => {
          if (state.mode === 'showcase') {
            return { currentStep: Math.max(0, state.currentStep - 1) };
          } else {
            return { spotlightStep: Math.max(0, state.spotlightStep - 1) };
          }
        }),

      setStep: (step: number) =>
        set((state) =>
          state.mode === 'showcase'
            ? { currentStep: Math.min(Math.max(0, step), TOTAL_SHOWCASE_STEPS - 1) }
            : { spotlightStep: Math.min(Math.max(0, step), TOTAL_SPOTLIGHT_STEPS - 1) }
        ),

      setMode: (mode: WalkthroughMode) =>
        set({ mode, currentStep: 0, spotlightStep: 0 }),

      setShowOnSignIn: (val: boolean) =>
        set({ showOnSignIn: val }),

      markAsSeen: () =>
        set({ hasSeenWalkthrough: true }),

      resetWalkthrough: () =>
        set({
          isOpen: true,
          mode: 'showcase',
          currentStep: 0,
          spotlightStep: 0,
        }),
    }),
    {
      name: 'capflow-walkthrough-settings', // base key; overridden per-user at runtime
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasSeenWalkthrough: state.hasSeenWalkthrough,
        showOnSignIn: state.showOnSignIn,
      }),
    }
  )
);

/**
 * Returns a user-scoped localStorage key for walkthrough state.
 */
export function getWalkthroughKey(userId: string | null | undefined): string {
  if (!userId) return 'capflow-walkthrough-settings';
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `capflow-walkthrough-${safe}`;
}

/**
 * Rehydrate walkthrough state for a specific user from localStorage
 */
export function rehydrateWalkthrough(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const key = getWalkthroughKey(userId);
  const raw = localStorage.getItem(key);

  const defaults = {
    hasSeenWalkthrough: false,
    showOnSignIn: true,
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const stored = parsed?.state ?? {};
      useWalkthroughStore.setState({
        hasSeenWalkthrough: stored.hasSeenWalkthrough ?? defaults.hasSeenWalkthrough,
        showOnSignIn: stored.showOnSignIn ?? defaults.showOnSignIn,
      });
    } catch {
      useWalkthroughStore.setState(defaults);
    }
  } else {
    useWalkthroughStore.setState(defaults);
  }

  const unsubscribe = useWalkthroughStore.subscribe((state) => {
    const toSave = {
      state: {
        hasSeenWalkthrough: state.hasSeenWalkthrough,
        showOnSignIn: state.showOnSignIn,
      },
      version: 0,
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  });

  if (typeof window !== 'undefined') {
    (window as Window & { __walkthroughUnsub?: () => void }).__walkthroughUnsub?.();
    (window as Window & { __walkthroughUnsub?: () => void }).__walkthroughUnsub = unsubscribe;
  }
}
