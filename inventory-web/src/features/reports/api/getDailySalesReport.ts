import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type DailySalesReport = {
  date: string;
  branch_id: number;
  employee_id: number | null;
  total_revenue: number;
  invoice_count: number;
  total_items_sold: number;
  by_item: Array<{
    item_id: number;
    name: string;
    variant_id: number;
    variant_model: string;
    qty_sold: number;
    revenue: number;
  }>;
  by_payment_method: Record<
    string,
    {
      invoices: number;
      revenue: number;
    }
  >;
  invoices: Array<{
    sales_invoice_id: number;
    sales_invoice_number: string;
    date_of_purchase: string;
    total_amount: number;
    payment_method: string;
    employee_id: number;
    salesperson: string;
  }>;
};

export async function getDailySalesReport(
  date: string,
): Promise<DailySalesReport> {
  const token = loginApi.getToken();
  const url = new URL(`${API_BASE_URL}/reports/sales/daily`);
  url.searchParams.set("date", date);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = await response.json().catch(() => null);
  const body = payload?.body ?? payload;

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message ?? response.statusText ?? "Request failed");
  }

  return (body?.data ?? body) as DailySalesReport;
}

export default getDailySalesReport;
