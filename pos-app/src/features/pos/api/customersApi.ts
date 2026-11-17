import { loginApi } from "@/features/authentications/api/loginApi";
import type {
  CustomerPage,
  CustomerQuery,
} from "../components/CustomerSelectModal";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type CustomerRecord = {
  customer_id?: number | string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  contact_number?: string | null;
};

const authHeaders = () => {
  const token = loginApi.getToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const customersApi = {
  /**
   * Paginated customer list with search and field filters.
   * GET /customers returns ALL customers (not limited to a branch).
   */
  list: async (query: CustomerQuery): Promise<CustomerPage> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/customers?${params}`, {
      headers: authHeaders(),
    });

    const payload = await response.json().catch(() => null);
    const body = payload?.body ?? payload ?? {};

    if (!response.ok || body.success === false) {
      throw new Error(
        body.message || `Failed to load customers (HTTP ${response.status})`,
      );
    }

    const data = Array.isArray(body.data) ? body.data : [];
    return {
      data,
      pagination: body.pagination ?? {
        total_items: data.length,
        total_pages: 1,
        current_page: query.page,
        per_page: query.per_page,
      },
    };
  },

  getByBranch: async (
    branchId: number | string,
  ): Promise<{
    success: boolean;
    data: CustomerRecord[];
    message?: string;
  }> => {
    const encodedBranchId = encodeURIComponent(String(branchId));
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: authHeaders(),
    });

    const payload = await response.json().catch(() => null);
    const body = payload?.body ?? payload ?? {};

    if (!response.ok || body.success === false) {
      throw new Error(
        body.message || `Failed to load customers (HTTP ${response.status})`,
      );
    }

    return {
      success: true,
      data: Array.isArray(body.data) ? body.data : [],
      message: body.message,
    };
  },
};

export default customersApi;
