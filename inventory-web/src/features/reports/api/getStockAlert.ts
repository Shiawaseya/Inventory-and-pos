import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type GetStockAlertParams = {
  branch_id?: number;
};

export async function getStockAlert(
  params: GetStockAlertParams = {},
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = loginApi.getToken();

  // Prefer explicit param, otherwise derive branch id from the authenticated user
  let branchId = params.branch_id;
  if (branchId == null) {
    const user = loginApi.getUser();
    // try common claim/property names
    // @ts-ignore
    branchId = user?.branchId ?? branchId;
  }

  const url = new URL(`${API_BASE_URL}/public/dashboard/stock-alerts`);
  if (branchId != null) url.searchParams.set("branch_id", String(branchId));

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

  // Normalize response shape
  const pkg = payload && payload.body ? payload.body : (payload ?? {});
  return {
    success: pkg.success ?? true,
    data: pkg.data ?? pkg,
    message: pkg.message,
  };
}

export default getStockAlert;
