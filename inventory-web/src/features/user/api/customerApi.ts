import { loginApi } from "@/features/authentications/api/loginApi";
import type { CustomerListResponse } from "../types/customer";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type CreateCustomerPayload = {
  first_name: string;
  middle_name: string;
  last_name: string;
  contact_number: string;
  email_address: string;
  street_address: string;
  barangay: string;
  city_municipality: string;
  province: string;
  region: string;
  postal_code: string;
  psgc_code: string;
  tin: string;
  business_style: string;
};

export type CreatedCustomer = CreateCustomerPayload & {
  customer_id?: number | string;
};

export type CustomerResponse = {
  success: boolean;
  data?: CreatedCustomer;
  message?: string;
};

export type CustomerFilters = {
  search?: string;
  sort?: string;
};

export const customerApi = {
  // GET /customers returns every customer (the backend ignores branch_id),
  // so newly created customers show up immediately.
  list: async (
    page = 1,
    perPage = 10,
    filters: CustomerFilters = {},
  ): Promise<CustomerListResponse> => {
    const token = loginApi.getToken();
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.sort) params.set("sort", filters.sort);

    const response = await fetch(`${API_BASE_URL}/customers?${params}`, {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.message ||
          `Failed to fetch customers (HTTP ${response.status})`,
      );
    }

    return payload as CustomerListResponse;
  },
  create: async (payload: CreateCustomerPayload): Promise<CustomerResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(`${API_BASE_URL}/public/customers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      throw new Error(
        body?.message || `Failed to create customer (HTTP ${response.status})`,
      );
    }

    return body;
  },
};
