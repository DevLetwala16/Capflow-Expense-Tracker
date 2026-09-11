// Storage abstraction layer - swappable backend
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

// localStorage adapter (default for settings)
export const localStorageAdapter: StorageAdapter = {
  get: async <T>(key: string): Promise<T | null> => {
    if (typeof window === 'undefined') return null;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  delete: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  list: async (): Promise<string[]> => {
    if (typeof window === 'undefined') return [];
    return Object.keys(localStorage);
  },
};
