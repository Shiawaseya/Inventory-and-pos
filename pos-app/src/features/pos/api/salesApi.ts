import { loginApi } from "@/features/authentications/api/loginApi";
import type { SalesInvoiceApiResponse } from "@/types/sales-invoice";
import type { CartLine, Customer, FinancingPayload } from "../types/pos.types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type ParkSalePayload = {
  branch_id?: number;
  employee_id?: number;
  payment_method: string;
  customer: Customer | null;
  reference_note?: string;
  /** Required for Home Credit sales; recorded in invoice_financing. */
  financing?: FinancingPayload;
  items: Array<{
    variant_id: number;
    unit_price_at_sale: number;
    quantity?: number;
    serials?: string[];
  }>;
};

export type CreateSalePayload = ParkSalePayload & {
  customer_is_verified?: boolean;
};

export const salesApi = {
  getParked: async (
    page = 1,
    perPage = 10,
  ): Promise<SalesInvoiceApiResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/public/sales-invoices/parked?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      throw new Error(
        body?.message ||
          `Unable to load parked sales (HTTP ${response.status})`,
      );
    }

    return body;
  },

  park: async (payload: ParkSalePayload) => {
    const token = loginApi.getToken();
    const response = await fetch(`${API_BASE_URL}/sales/park`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      throw new Error(
        body?.message || `Unable to park sale (HTTP ${response.status})`,
      );
    }

    return body;
  },

  createWithoutAuthorization: async (payload: CreateSalePayload) => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/sales/create-without-authorization`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      throw new Error(
        body?.message || `Unable to create sale (HTTP ${response.status})`,
      );
    }

    return body;
  },

  resumeWithoutAuthorization: async (invoiceId: number) => {
    return resumeInvoice(invoiceId, "resume-without-authorization");
  },
};

async function resumeInvoice(invoiceId: number, action: string) {
  const token = loginApi.getToken();
  const response = await fetch(`${API_BASE_URL}/sales/${invoiceId}/${action}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: "{}",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(
      body?.message || `Unable to resume sale (HTTP ${response.status})`,
    );
  }
  return body;
}

export function buildSaleItems(cart: CartLine[]): ParkSalePayload["items"] {
  return cart.map((line) => ({
    variant_id: line.variantId,
    unit_price_at_sale: line.price,
    ...(line.serial ? { serials: [line.serial] } : { quantity: line.quantity }),
  }));
}

export default salesApi;
