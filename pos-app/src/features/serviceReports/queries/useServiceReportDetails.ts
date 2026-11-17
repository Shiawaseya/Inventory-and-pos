import { useQuery } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";

export function useServiceReportDetails(id: number | null) {
  return useQuery({
    queryKey: ["service-report", id],
    queryFn: () => serviceReportsApi.getById(id!),
    enabled: Boolean(id),
  });
}

export default useServiceReportDetails;
