import { create } from "zustand";
import { db, Category, seedDefaultCategories } from "@/lib/db";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  initialized: boolean;
  currentUserId: string | null;
  loadCategories: (userId: string) => Promise<Category[]>;
  getCategory: (id: number) => Category | undefined;
  refreshCategories: (userId: string) => Promise<void>;
  addCategory: (userId: string, data: Omit<Category, "id" | "userId">) => Promise<void>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  initialized: false,
  currentUserId: null,

  loadCategories: async (userId: string) => {
    const { initialized, categories, currentUserId } = get();
    // Return cached categories only if initialized for the EXACT same user
    if (initialized && currentUserId === userId && categories.length > 0) {
      return categories;
    }

    set({ loading: true, currentUserId: userId });
    try {
      await seedDefaultCategories(userId);
      const cats = await db.categories
        .where("userId")
        .equals(userId)
        .sortBy("order");
      const uniqueCats = cats.filter(
        (c, idx, arr) =>
          idx ===
          arr.findIndex(
            (x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase()
          )
      );
      set({ categories: uniqueCats, loading: false, initialized: true, currentUserId: userId });
      return uniqueCats;
    } catch {
      set({ loading: false });
      return [];
    }
  },

  getCategory: (id: number) => {
    return get().categories.find((c) => c.id === id);
  },

  refreshCategories: async (userId: string) => {
    set({ loading: true });
    const cats = await db.categories
      .where("userId")
      .equals(userId)
      .sortBy("order");
    const uniqueCats = cats.filter(
      (c, idx, arr) =>
        idx ===
        arr.findIndex(
          (x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase()
        )
    );
    set({ categories: uniqueCats, loading: false, initialized: true });
  },

  addCategory: async (userId: string, data: Omit<Category, "id" | "userId">) => {
    const newCat: Omit<Category, "id"> = { ...data, userId };
    const id = await db.categories.add(newCat as Category);
    const cat = await db.categories.get(id as number);
    if (cat) {
      set((state) => ({ categories: [...state.categories, cat] }));
    }
  },

  updateCategory: async (id: number, updates: Partial<Category>) => {
    await db.categories.update(id, updates);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteCategory: async (id: number) => {
    await db.categories.delete(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },
}));
