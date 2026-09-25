import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  /** Call this when switching between accounts to flush in-memory store state */
  clearDataStores: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => {
        const prev = get().user;
        // If a different user is logging in, wipe cached store data first
        if (prev && user && prev.id !== user.id) {
          get().clearDataStores();
        }
        set({ user, isAuthenticated: !!user });
      },

      logout: () => {
        get().clearDataStores();
        set({ user: null, isAuthenticated: false });
      },

      clearDataStores: () => {
        // Dynamically import stores to avoid circular deps; reset their in-memory state
        import('./transactionStore').then(({ useTransactionStore }) => {
          useTransactionStore.setState({
            transactions: [],
            loading: false,
            loadedMonth: null,
          });
        });
        import('./categoryStore').then(({ useCategoryStore }) => {
          useCategoryStore.setState({
            categories: [],
            loading: false,
            initialized: false,
          });
        });
        import('./budgetStore').then(({ useBudgetStore }) => {
          useBudgetStore.setState({
            budgets: [],
            goals: [],
            loading: false,
            loadedMonth: null,
            goalsLoaded: false,
          });
        });
      },
    }),
    {
      name: 'capflow-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
