import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type StockUnitStatus = "available" | "reserved" | "damaged" | "sold";

export type StockUnitRecord = {
  stock_unit_id: number;
  serial_number: string;
  status: StockUnitStatus;
  variant_id: number;
  branch_id: number;
};

export type SerialVariantRecord = {
  stock_unit_id: number;
  serial_number: string;
  status: StockUnitStatus;
  branch_id: number;
  variant_id: number;
  branch_item_id: number | null;
  item_id: number;
  model: string | null;
  sku: string | null;
  image_url: string | null;
  price: number | null;
  is_serialized: boolean;
  item: {
    name: string;
    image_url: string | null;
  };
};

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

export type StockUnitsApiResponse = {
  success: boolean;
  data: StockUnitRecord[];
  links: PaginationLinks;
  pagination: PaginationMeta;
  message?: string;
};

export type StockUnitsQueryParams = {
  page?: number | string;
  per_page?: number | string;
  status?: string;
  search?: string;
  sort?: string;
};

export type CreateStockUnitPayload = {
  branch_id?: number;
  items: Array<{
    item_id: number;
    serials: string[];
  }>;
};

export const stockUnitApi = {
  create: async (
    payload: CreateStockUnitPayload,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();
    const user = loginApi.getUser();
    // @ts-ignore
    const branchId = user?.branchId ?? undefined;

    const endpoint =
      branchId != null
        ? `${API_BASE_URL}/branches/${encodeURIComponent(branchId)}/stock-units/bulk`
        : `${API_BASE_URL}/stock-units`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items: payload.items }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },

  getByVariant: async (
    variantId: number,
    params?: StockUnitsQueryParams,
  ): Promise<StockUnitsApiResponse> => {
    const token = loginApi.getToken();
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.sort) searchParams.set("sort", params.sort);

    const qs = searchParams.toString();
    const endpoint = `${API_BASE_URL}/stock-units/variant/${variantId}${qs ? `?${qs}` : ""}`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.message ||
          `Failed to fetch stock units (HTTP ${response.status})`,
      );
    }

    return data;
  },

  getVariantBySerial: async (
    serial: string,
  ): Promise<{ success: boolean; data: SerialVariantRecord; message?: string }> => {
    const token = loginApi.getToken();
    const serialPath = encodeURIComponent(serial).replace(/%2F/gi, "/");
    const endpoint = `${API_BASE_URL}/api/inventory/serials/${serialPath}/variant`;
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data?.data) {
      throw new Error(
        data?.message ||
          `Failed to fetch variant for serial (HTTP ${response.status})`,
      );
    }

    return data;
  },

  getBySku: async (
    sku: string,
    params?: StockUnitsQueryParams,
  ): Promise<StockUnitsApiResponse> => {
    const token = loginApi.getToken();
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.sort) searchParams.set("sort", params.sort);

    const qs = searchParams.toString();
    const endpoint = `${API_BASE_URL}/stock-units/variant/sku/${encodeURIComponent(sku)}${qs ? `?${qs}` : ""}`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.message ||
          `Failed to fetch stock units by SKU (HTTP ${response.status})`,
      );
    }

    return data;
  },
};

export default stockUnitApi;
