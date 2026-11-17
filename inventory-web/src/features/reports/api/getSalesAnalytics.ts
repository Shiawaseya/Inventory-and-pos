import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type GetSalesAnalyticsParams = {
  period: string; // 'week' | 'month' | 'custom' | etc.
  start_date?: string;
  end_date?: string;
  branch_id?: number;
};

export async function getSalesAnalytics(
  params: GetSalesAnalyticsParams,
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = loginApi.getToken();

  let branchId = params.branch_id;
  if (branchId == null) {
    const user = loginApi.getUser();
    // try common claim/property names
    // @ts-ignore
    branchId = user?.branchId ?? branchId;
  }

  const url = new URL(`${API_BASE_URL}/public/dashboard/sales-analytics`);
  const sp = url.searchParams;
  sp.set("period", params.period ?? "custom");
  if (params.period === "custom") {
    if (params.start_date) sp.set("start_date", params.start_date);
    if (params.end_date) sp.set("end_date", params.end_date);
  }
  if (branchId != null) sp.set("branch_id", String(branchId));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch (e) {
    payload = null;
  }

  if (!res.ok) {
    return {
      success: false,
      data: undefined,
      message: payload?.message ?? res.statusText,
    };
  }

  const pkg = payload && payload.body ? payload.body : (payload ?? {});
  return {
    success: pkg.success ?? true,
    data: pkg.data ?? pkg,
    message: pkg.message,
  };
}

export default getSalesAnalytics;
