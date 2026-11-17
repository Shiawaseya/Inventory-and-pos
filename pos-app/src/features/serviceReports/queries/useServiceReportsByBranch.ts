import { useQuery } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";

export function useServiceReportsByBranch(
  branchId: number | null,
  page: number,
) {
  return useQuery({
    queryKey: ["service-reports", "branch", branchId, page],
    queryFn: () => serviceReportsApi.getByBranch(branchId!, page),
    enabled: Boolean(branchId),
    placeholderData: (previous) => previous,
  });
}

export default useServiceReportsByBranch;
