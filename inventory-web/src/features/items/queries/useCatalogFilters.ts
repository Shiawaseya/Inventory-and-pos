import { useQuery } from "@tanstack/react-query";
import { catalogFilterApi } from "@/features/items/api/catalogFilterApi";

/** Brand + category options for the inventory filters (cached for 10 minutes). */
export function useCatalogFilters() {
  const brands = useQuery({
    queryKey: ["catalog-filter", "brands"],
    queryFn: catalogFilterApi.getBrands,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categories = useQuery({
    queryKey: ["catalog-filter", "categories"],
    queryFn: catalogFilterApi.getCategories,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    brands: (brands.data ?? []).filter((b) => b.is_active !== false),
    categories: categories.data ?? [],
    isLoading: brands.isLoading || categories.isLoading,
  };
}

export default useCatalogFilters;
