import { loginApi } from "@/features/authentications/api/loginApi";
import type { CustomerListResponse } from "../types/customer";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export const customerApi = {
  getByBranch: async (
    branchId: number,
    page = 1,
    perPage = 10,
  ): Promise<CustomerListResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/branches/${branchId}/customers?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.message ||
          `Failed to fetch customers (HTTP ${response.status})`,
      );
    }

    return payload as CustomerListResponse;
  },
};
