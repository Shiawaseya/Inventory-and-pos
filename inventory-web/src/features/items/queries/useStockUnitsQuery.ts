import { useQuery } from "@tanstack/react-query";
import {
  stockUnitApi,
  type StockUnitsApiResponse,
  type StockUnitsQueryParams,
} from "../api/stockUnitApi";

export const STOCK_UNITS_QUERY_KEY = "stock-units";

export function useStockUnitsByVariant(
  variantId: number | null | undefined,
  params: StockUnitsQueryParams,
  enabled: boolean = true,
) {
  return useQuery<StockUnitsApiResponse>({
    queryKey: [STOCK_UNITS_QUERY_KEY, variantId, params],
    queryFn: () => stockUnitApi.getByVariant(variantId!, params),
    enabled: enabled && !!variantId,
    placeholderData: (prev) => prev,
  });
}
