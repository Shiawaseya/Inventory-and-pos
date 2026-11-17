import { useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";
import type { AddServiceReportActionRequest } from "../types/serviceReport";

export function useAddServiceReportAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: AddServiceReportActionRequest;
    }) => serviceReportsApi.addAction(id, payload),
    onSuccess: (report) => {
      queryClient.setQueryData(["service-report", report.id], report);
      queryClient.invalidateQueries({
        queryKey: ["service-reports", "branch"],
      });
    },
  });
}

export default useAddServiceReportAction;
