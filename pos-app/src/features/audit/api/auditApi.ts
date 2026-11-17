import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "SALE"
  | "PRICE_CHANGE"
  | "STOCK_ADJUSTMENT"
  | "ONBOARDING";

export type AuditModule =
  | "inventory"
  | "items"
  | "item_variants"
  | "branch_item"
  | "stock_unit"
  | "stock_adjustments"
  | "sales"
  | "customers"
  | "employees"
  | "team_onboarding"
  | "brands"
  | "categories";

export type AuditLogItem = {
  audit_id: number;
  employee_id: number | null;
  employee_name: string | null;
  branch_id: number | null;
  action: AuditAction;
  module: AuditModule;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PaginationMeta = {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
};

export type PaginationLinks = {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
};

export type AuditLogsResponse = {
  success: boolean;
  data: AuditLogItem[];
  links: PaginationLinks;
  pagination: PaginationMeta;
  message?: string;
};

export type AuditLogsQueryParams = {
  page?: number | string;
  per_page?: number | string;
  search?: string;
  action?: AuditAction | string;
  module?: AuditModule | string;
  branch_id?: number | string;
};

export const auditApi = {
  getLogs: async (
    params?: AuditLogsQueryParams,
  ): Promise<AuditLogsResponse> => {
    const token = loginApi.getToken();
    const user = loginApi.getUser();
    const branchId = params?.branch_id ?? user?.branchId;

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.module) searchParams.set("module", params.module);
    if (branchId) searchParams.set("branch_id", String(branchId));

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/audit-logs${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      throw new Error(
        payload?.message || `Failed to fetch audit logs (HTTP ${res.status})`,
      );
    }

    return payload as AuditLogsResponse;
  },
};

export default auditApi;
