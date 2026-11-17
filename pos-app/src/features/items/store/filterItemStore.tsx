import { create } from "zustand";

type FilterItemState = {
  searchQuery: string;
  selectedCategories: string[];
  selectedBrands: string[];
  setSearchQuery: (q: string) => void;
  toggleCategory: (c: string) => void;
  toggleBrand: (b: string) => void;
  clearFilters: () => void;
};

export const useFilterItemStore = create<FilterItemState>((set) => ({
  searchQuery: "",
  selectedCategories: [],
  selectedBrands: [],
  setSearchQuery: (q: string) => set({ searchQuery: q }),
  toggleCategory: (c: string) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(c)
        ? state.selectedCategories.filter((x) => x !== c)
        : [...state.selectedCategories, c],
    })),
  toggleBrand: (b: string) =>
    set((state) => ({
      selectedBrands: state.selectedBrands.includes(b)
        ? state.selectedBrands.filter((x) => x !== b)
        : [...state.selectedBrands, b],
    })),
  clearFilters: () =>
    set({ searchQuery: "", selectedCategories: [], selectedBrands: [] }),
}));

export default useFilterItemStore;
