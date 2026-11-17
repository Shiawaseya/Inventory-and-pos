import { useQuery } from "@tanstack/react-query";
import {
  auditApi,
  type AuditLogsQueryParams,
  type AuditLogsResponse,
} from "../api/auditApi";

export const useAuditLogsQuery = (params: AuditLogsQueryParams) => {
  return useQuery<AuditLogsResponse, Error>({
    queryKey: ["audit-logs", params],
    queryFn: () => auditApi.getLogs(params),
    placeholderData: (previousData) => previousData,
  });
};
