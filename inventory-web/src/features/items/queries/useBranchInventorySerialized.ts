import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  branchInventoryItemApi,
  type BranchInventorySerializedResponse,
} from "@/features/items/api/branchInventoryItemApi";

const pad = (n: number) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The stock-movement range is never empty: with no (or an incomplete) range in the URL
 * it defaults to today.
 */
export function resolveRangeParams(searchParams: URLSearchParams) {
  const range = searchParams.get("range") || "";
  const date = searchParams.get("date") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  if (range === "custom" && from && to) {
    return { range: "custom", date: "", from, to, isDefault: false };
  }
  if (range && range !== "custom") {
    // legacy URLs: daily | weekly | monthly | yearly (+ optional date)
    return { range, date, from: "", to: "", isDefault: false };
  }
  const today = todayISO();
  return { range: "custom", date: "", from: today, to: today, isDefault: true };
}

export function useBranchInventorySerialized() {
  const [searchParams] = useSearchParams();

  const page = searchParams.get("page") || "1";
  const per_page = searchParams.get("per_page") || "10";
  const sort = searchParams.get("sort") || "";
  const search = searchParams.get("search") || "";
  const brand_id = searchParams.get("brand_id") || "";
  const category_id = searchParams.get("category_id") || "";

  const { range, date, from, to } = resolveRangeParams(searchParams);

  const params = {
    page,
    per_page,
    sort,
    search,
    brand_id,
    category_id,
    range,
    date,
    from,
    to,
  };

  return useQuery<BranchInventorySerializedResponse>({
    queryKey: ["branch-inventory-serialized", params],
    queryFn: () => branchInventoryItemApi.getSerialized(params),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

export default useBranchInventorySerialized;
