// features/reports/api/extraReportsApi.ts
import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type DateRange = { start_date: string; end_date: string };

async function get<T>(path: string, range: DateRange): Promise<T> {
  const token = loginApi.getToken();
  const url = new URL(`${API_BASE_URL}${path}`);
  url.searchParams.set("start_date", range.start_date);
  url.searchParams.set("end_date", range.end_date);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload: any = await res.json().catch(() => null);
  const pkg = payload?.body ?? payload;
  if (!res.ok || pkg?.success === false) {
    throw new Error(pkg?.message ?? res.statusText ?? "Request failed");
  }
  return pkg?.data as T;
}

export interface SalesIntegrity {
  period: { start: string; end: string };
  summary: Record<
    "completed" | "voided" | "pending_authorization" | "rejected" | "parked",
    { count: number; amount: number }
  >;
  void_rate: number;
  pending_queue: {
    id: number;
    invoice_number: string;
    amount: number;
    staff: string;
    note: string | null;
    created_at: string;
    age_hours: number;
  }[];
  voids_by_staff: { id: number; name: string; voids: number; amount: number }[];
}

export interface StockShrinkage {
  period: { start: string; end: string };
  moved_to_loss: { damaged: number; lost: number; written_off: number };
  by_reason: { reason: string; adjustments: number; units: number }[];
  status_snapshot: { status: string; units: number }[];
  at_risk: { units: number; value: number };
  top_affected: { name: string; item: string; units: number }[];
}

export const getSalesIntegrity = (r: DateRange) =>
  get<SalesIntegrity>("/reports/sales-integrity", r);
export const getStockShrinkage = (r: DateRange) =>
  get<StockShrinkage>("/reports/stock-shrinkage", r);

export interface CustomerInsights {
  period: { start: string; end: string };
  invoices: number;
  walk_in: { invoices: number; amount: number; share_pct: number };
  active_customers: number;
  returning_customers: number;
  returning_pct: number;
  new_customers: number;
  top_customers: {
    id: number;
    name: string;
    invoices: number;
    spend: number;
    last_purchase: string;
  }[];
}

export interface ServiceDesk {
  period: { start: string; end: string };
  total: number;
  certified: number;
  no_action: number;
  avg_certify_hours: number | null;
  open: { total: number; d0_3: number; d4_7: number; d8_plus: number };
  oldest_open: {
    id: number;
    control_number: string;
    model: string;
    complaint: string;
    days_open: number;
    actions: number;
  }[];
  routing: { destination: string; count: number }[];
  defect_rates: {
    model: string;
    brand: string;
    incidents: number;
    units_sold: number;
    rate_pct: number | null;
  }[];
}

export const getCustomerInsights = (r: DateRange) =>
  get<CustomerInsights>("/reports/customer-insights", r);
export const getServiceDesk = (r: DateRange) =>
  get<ServiceDesk>("/reports/service-desk", r);
