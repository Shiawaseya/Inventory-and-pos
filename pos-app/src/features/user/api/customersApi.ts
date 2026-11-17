import { loginApi } from "@/features/authentications/api/loginApi";

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

export const customersApi = {
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

export default customersApi;
