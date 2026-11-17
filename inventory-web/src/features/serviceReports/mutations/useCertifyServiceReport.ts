import { useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";

export function useCertifyServiceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviceReportsApi.certify(id),
    onSuccess: (report) => {
      queryClient.setQueryData(["service-report", report.id], report);
      queryClient.invalidateQueries({
        queryKey: ["service-reports", "branch"],
      });
    },
  });
}

export default useCertifyServiceReport;
