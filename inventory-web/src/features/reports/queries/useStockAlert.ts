import { useQuery } from "@tanstack/react-query";
import getStockAlert from "@/features/reports/api/getStockAlert";
import type { GetStockAlertParams } from "@/features/reports/api/getStockAlert";

export function useStockAlert(params: GetStockAlertParams = {}, options?: any) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stock-alerts", params],
    queryFn: () => getStockAlert(params),
    ...(options ?? {}),
  });

  return { data, isLoading, isError, error, refetch } as const;
}

export default useStockAlert;
