import { loginApi } from "@/features/authentications/api/loginApi";
import type { VariantRow } from "../lib/groupBySerializedItem";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type PaginationMeta = {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
};

export type PaginationLinks = {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
};

export type BranchInventorySerializedResponse = {
  success: boolean;
  data: VariantRow[];
  links: PaginationLinks;
  pagination: PaginationMeta;
  range?: { type: string; from: string; to: string };
  message?: string;
};

export type SerializedInventoryQueryParams = {
  page?: number | string;
  per_page?: number | string;
  sort?: string;
  search?: string;
  branch_id?: number | string;
  brand_id?: number | string;
  category_id?: number | string;
  // Stock movement range: daily | weekly | monthly | yearly | custom
  range?: string;
  date?: string;
  from?: string;
  to?: string;
};

export const branchInventoryItemApi = {
  getSerialized: async (
    params?: SerializedInventoryQueryParams,
  ): Promise<BranchInventorySerializedResponse> => {
    const token = loginApi.getToken();
    const user = loginApi.getUser();
    const branchId = params?.branch_id ?? user?.branchId ?? 1;

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.brand_id) searchParams.set("brand_id", String(params.brand_id));
    if (params?.category_id)
      searchParams.set("category_id", String(params.category_id));
    if (params?.range) searchParams.set("range", params.range);
    if (params?.date) searchParams.set("date", params.date);
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/branches/${branchId}/inventory/serialized${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      throw new Error(
        payload?.message || `Failed to fetch inventory (HTTP ${res.status})`,
      );
    }

    return payload;
  },

  update: async (
    id: number,
    payload: { price?: number | null; reorder_level?: number | null | string },
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();
    const body: Record<string, any> = {};

    if (payload.price !== undefined) body.price = payload.price;
    if (payload.reorder_level !== undefined) {
      body.reorder_level =
        payload.reorder_level === "" ? null : payload.reorder_level;
    }

    const res = await fetch(
      `${API_BASE_URL}/branch-items/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { success: false, message: data?.message || res.statusText };
    }

    return {
      success: data?.success ?? true,
      data: data?.data ?? data,
      message: data?.message,
    };
  },
};

export default branchInventoryItemApi;
