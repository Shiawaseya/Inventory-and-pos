import { useQuery } from "@tanstack/react-query";
import getKpi from "@/features/reports/api/getKpi";
import type { GetKpiParams } from "@/features/reports/api/getKpi";

export function useKpi(params: GetKpiParams, options?: any) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["kpi", params],
    queryFn: () => getKpi(params),
    ...(options ?? {}),
  });

  return { data, isLoading, isError, error, refetch } as const;
}

export default useKpi;
