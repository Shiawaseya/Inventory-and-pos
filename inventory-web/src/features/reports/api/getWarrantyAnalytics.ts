import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type GetWarrantyParams = {
  branch_id?: number;
};

export async function getWarrantyAnalytics(
  params: GetWarrantyParams = {},
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = loginApi.getToken();

  let branchId = params.branch_id;
  if (branchId == null) {
    const user = loginApi.getUser();
    // @ts-ignore
    branchId = user?.branchId ?? branchId ?? 1;
  }

  const url = new URL(`${API_BASE_URL}/reports/warranty/${branchId}`);

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

export default getWarrantyAnalytics;
