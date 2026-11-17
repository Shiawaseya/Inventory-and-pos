import { useQuery } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";
import { useFilterItemStore } from "@/features/items/store/filterItemStore";

export function useItem() {
  const searchQuery = useFilterItemStore((s) => s.searchQuery);
  const selectedCategories = useFilterItemStore((s) => s.selectedCategories);
  const selectedBrands = useFilterItemStore((s) => s.selectedBrands);

  return useQuery({
    queryKey: [
      "items",
      searchQuery,
      selectedCategories.join(","),
      selectedBrands.join(","),
    ],
    queryFn: async () => {
      const res = await itemsApi.getAll();
      const all = res.data ?? [];

      // client-side filtering based on store values
      const q = (searchQuery || "").trim().toLowerCase();

      const filtered = all.filter((it: any) => {
        if (q) {
          const name = (it.name ?? "").toString().toLowerCase();
          if (!name.includes(q)) return false;
        }

        if (selectedCategories && selectedCategories.length > 0) {
          const catName = (it.category?.name ?? "").toString();
          if (!selectedCategories.includes(catName)) return false;
        }

        if (selectedBrands && selectedBrands.length > 0) {
          const brandName = (it.brand?.name ?? "").toString();
          if (!selectedBrands.includes(brandName)) return false;
        }

        return true;
      });

      return { ...res, data: filtered };
    },
  });
}
