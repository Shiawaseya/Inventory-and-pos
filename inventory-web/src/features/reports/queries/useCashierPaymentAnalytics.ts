import { useQuery } from "@tanstack/react-query";
import getCashierPaymentAnalytics from "@/features/reports/api/getCashierPaymentAnalytics";
import type { GetCashierPaymentParams } from "@/features/reports/api/getCashierPaymentAnalytics";

export function useCashierPaymentAnalytics(
  params: GetCashierPaymentParams = {},
  options?: any,
) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cashier-payment-analytics", params],
    queryFn: () => getCashierPaymentAnalytics(params),
    staleTime: 1000 * 60 * 3,
    ...(options ?? {}),
  });

  return { data, isLoading, isError, error, refetch } as const;
}

export default useCashierPaymentAnalytics;
