import { useQuery } from "@tanstack/react-query";
import getSalesAnalytics from "@/features/reports/api/getSalesAnalytics";
import type { GetSalesAnalyticsParams } from "@/features/reports/api/getSalesAnalytics";

export function useSalesAnalytics(
  params: GetSalesAnalyticsParams = {},
  options?: any,
) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sales-analytics", params],
    queryFn: () => getSalesAnalytics(params),
    ...(options ?? {}),
  });

  return { data, isLoading, isError, error, refetch } as const;
}

export default useSalesAnalytics;
