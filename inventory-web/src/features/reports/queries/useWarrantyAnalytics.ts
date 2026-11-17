import { useQuery } from "@tanstack/react-query";
import getWarrantyAnalytics from "@/features/reports/api/getWarrantyAnalytics";
import type { GetWarrantyParams } from "@/features/reports/api/getWarrantyAnalytics";

export function useWarrantyAnalytics(
  params: GetWarrantyParams = {},
  options?: any,
) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["warranty-analytics", params],
    queryFn: () => getWarrantyAnalytics(params),
    staleTime: 1000 * 60 * 3,
    ...(options ?? {}),
  });

  return { data, isLoading, isError, error, refetch } as const;
}

export default useWarrantyAnalytics;
