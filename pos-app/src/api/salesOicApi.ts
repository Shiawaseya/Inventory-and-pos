import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type SalesOicRecord = {
  employee_id?: number | string;
  id?: number | string;
};

type SalesOicResponse = {
  success: boolean;
  data: SalesOicRecord[];
  message?: string;
};

export const salesOicApi = {
  getSalesOic: async (branchId: number | string): Promise<SalesOicResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/employees/sales-oic/branch/${encodeURIComponent(String(branchId))}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const payload = await response.json().catch(() => null);
    const body = payload?.body ?? payload ?? {};
    const data = Array.isArray(body.data)
      ? body.data
      : body.data
        ? [body.data]
        : [];

    if (!response.ok || body.success === false) {
      throw new Error(
        body.message || `Failed to load sales OIC (HTTP ${response.status})`,
      );
    }

    return { success: true, data, message: body.message };
  },
};

export default salesOicApi;
