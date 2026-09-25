import { create } from "zustand";
import { db, Category, seedDefaultCategories } from "@/lib/db";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  initialized: boolean;
  loadCategories: () => Promise<Category[]>;
  getCategory: (id: number) => Category | undefined;
  refreshCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  initialized: false,

  loadCategories: async () => {
    const { initialized, categories } = get();
    // Return cached categories immediately if already initialized
    if (initialized && categories.length > 0) {
      return categories;
    }

    set({ loading: true });
    try {
      await seedDefaultCategories();
      const cats = await db.categories.orderBy("order").toArray();
      const uniqueCats = cats.filter(
        (c, idx, arr) => idx === arr.findIndex((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      set({ categories: uniqueCats, loading: false, initialized: true });
      return uniqueCats;
    } catch {
      set({ loading: false });
      return [];
    }
  },

  getCategory: (id: number) => {
    return get().categories.find((c) => c.id === id);
  },

  refreshCategories: async () => {
    set({ loading: true });
    const cats = await db.categories.orderBy("order").toArray();
    const uniqueCats = cats.filter(
      (c, idx, arr) => idx === arr.findIndex((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())
    );
    set({ categories: uniqueCats, loading: false, initialized: true });
  },
}));
