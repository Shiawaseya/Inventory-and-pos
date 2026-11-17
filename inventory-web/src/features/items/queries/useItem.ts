import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { itemsApi, type ItemsApiResponse } from "@/features/items/api/itemsApi";

export function useItem() {
  const [searchParams] = useSearchParams();

  // Read current URL parameters (synced with React Router)
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "12";
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id") || "";
  const brandId = searchParams.get("brand_id") || "";
  const isSerialized = searchParams.get("is_serialized") || "";
  const sort = searchParams.get("sort") || "";

  return useQuery<ItemsApiResponse>({
    queryKey: [
      "items",
      {
        page,
        perPage,
        search,
        categoryId,
        brandId,
        isSerialized,
        sort,
      },
    ],
    queryFn: async () => {
      // Delegate filtering and slicing to backend Doctrine repositories
      return await itemsApi.getAll({
        page,
        per_page: perPage,
        search,
        category_id: categoryId,
        brand_id: brandId,
        is_serialized: isSerialized,
        sort,
      });
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}
