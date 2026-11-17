import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  brandsApi,
  type BrandApiResponse,
  type BrandRecord,
} from "../api/brandsApi";

export const BRAND_QUERY_KEY = "brands";

// Hook for the paginated Brand Table (driven by URL params)
export function usePaginatedBrands() {
  const [searchParams] = useSearchParams();

  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "10";
  const sort = searchParams.get("sort") || "";
  const search = searchParams.get("search") || "";

  return useQuery<BrandApiResponse>({
    queryKey: [BRAND_QUERY_KEY, { page, perPage, sort, search }],
    queryFn: () => brandsApi.getAll({ page, per_page: perPage, sort, search }),
    placeholderData: (previousData) => previousData,
  });
}

// Hook for dropdowns, filter chips, and picker dialogs (flat array)
export function useBrands(params?: { per_page?: number }) {
  const query = useQuery<BrandApiResponse>({
    queryKey: [BRAND_QUERY_KEY, "all", params],
    queryFn: () => brandsApi.getAll({ per_page: params?.per_page ?? 100 }),
  });

  return {
    ...query,
    // Normalizes brand_id to id so pickers & chips continue working seamlessly
    brands:
      query.data?.data.map((b) => ({
        ...b,
        id: b.brand_id,
      })) ?? [],
  };
}
