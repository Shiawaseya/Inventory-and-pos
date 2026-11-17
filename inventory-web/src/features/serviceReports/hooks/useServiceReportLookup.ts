import { useMutation } from "@tanstack/react-query";
import { serviceReportsApi } from "../api/serviceReportsApi";

export function useServiceReportLookup() {
  return useMutation({
    mutationFn: (searchTerm: string) => serviceReportsApi.lookup(searchTerm),
  });
}

export default useServiceReportLookup;
