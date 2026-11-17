import { useMutation } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";
import type { CreateServiceReportRequest } from "../types/serviceReport";

export function useCreateServiceReport() {
  return useMutation({
    mutationFn: (payload: CreateServiceReportRequest) =>
      serviceReportsApi.create(payload),
  });
}

export default useCreateServiceReport;
