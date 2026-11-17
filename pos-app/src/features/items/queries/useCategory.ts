import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  categoriesApi,
  type CategoryApiResponse,
  type CategoryRecord,
} from "../api/categoriesApi";

export const CATEGORY_QUERY_KEY = "categories";

// URL-driven hook for paginated Category tables
export function usePaginatedCategories() {
  const [searchParams] = useSearchParams();

  const page = searchParams.get("page") || "1";
  const per_page = searchParams.get("per_page") || "10";
  const sort = searchParams.get("sort") || "";
  const search = searchParams.get("search") || "";

  return useQuery<CategoryApiResponse>({
    queryKey: [CATEGORY_QUERY_KEY, { page, per_page, sort, search }],
    queryFn: () => categoriesApi.getAll({ page, per_page, sort, search }),
    placeholderData: (prev) => prev,
  });
}

// Flat-array hook for CategoryList chips and CategoryPickerDialog
export function useCategory(params?: { per_page?: number }) {
  const query = useQuery<CategoryApiResponse>({
    queryKey: [CATEGORY_QUERY_KEY, "all", params],
    queryFn: () => categoriesApi.getAll({ per_page: params?.per_page ?? 100 }),
  });

  const categories = (query.data?.data ?? []).map((c: CategoryRecord) => ({
    ...c,
    id: c.category_id,
  }));

  return {
    ...query,
    categories,
  };
}
