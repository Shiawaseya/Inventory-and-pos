import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type GetKpiParams = {
  period: string; // e.g. 'week' | 'custom'
  start_date?: string; // required when period === 'custom'
  end_date?: string; // required when period === 'custom'
  branch_id?: number; // optional override; if omitted we try to read from token
};

export async function getKpi(
  params: GetKpiParams,
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

  const url = new URL(`${API_BASE_URL}/public/dashboard/kpi`);
  const sp = url.searchParams;
  sp.set("period", params.period ?? "week");
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

  // Normalize some backends that wrap data
  const pkg = payload && payload.body ? payload.body : (payload ?? {});
  return {
    success: pkg.success ?? true,
    data: pkg.data ?? pkg,
    message: pkg.message,
  };
}

function decodeBase64Url(input: string) {
  // Replace URL-safe characters
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '='
  const pad = input.length % 4;
  if (pad === 2) input += "==";
  else if (pad === 3) input += "=";
  else if (pad !== 0) input += "";
  try {
    // atob is available in browsers; fallback to Buffer for Node-like envs
    if (typeof atob === "function") return atob(input);
  } catch (e) {
    // ignore
  }
  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch (e) {
    return "";
  }
}

export default getKpi;
