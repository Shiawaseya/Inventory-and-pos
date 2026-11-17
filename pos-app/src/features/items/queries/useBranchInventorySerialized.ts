import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  branchInventoryItemApi,
  type BranchInventorySerializedResponse,
} from "@/features/items/api/branchInventoryItemApi";

export function useBranchInventorySerialized() {
  const [searchParams] = useSearchParams();

  const page = searchParams.get("page") || "1";
  const per_page = searchParams.get("per_page") || "100";
  const sort = searchParams.get("sort") || "";
  const search = searchParams.get("search") || "";

  return useQuery<BranchInventorySerializedResponse>({
    queryKey: ["branch-inventory-serialized", { page, per_page, sort, search }],
    queryFn: () =>
      branchInventoryItemApi.getSerialized({ page, per_page, sort, search }),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export default useBranchInventorySerialized;
