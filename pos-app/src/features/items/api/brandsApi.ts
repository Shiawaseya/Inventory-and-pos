import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type BrandRecord = {
  brand_id: number;
  name: string;
  is_active: boolean;
  recorded_by?: {
    id: number;
    name: string;
  } | null;
  created_at?: string;
  description?: string | null;
  trend?: string;
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

export type BrandApiResponse = {
  success: boolean;
  data: BrandRecord[];
  links: PaginationLinks;
  pagination: PaginationMeta;
  message?: string;
};

export type BrandQueryParams = {
  page?: number | string;
  per_page?: number | string;
  sort?: string;
  search?: string;
};

export type CreateBrandRequest = {
  name: string;
  description?: string | null;
  recorded_by?: number | null;
};

export type CreateBrandResponse = {
  success: boolean;
  data?: any;
  message?: string;
};

export const brandsApi = {
  getAll: async (
    params?: BrandQueryParams | URLSearchParams,
  ): Promise<BrandApiResponse> => {
    const token = loginApi.getToken();
    let queryString = "";

    if (params instanceof URLSearchParams) {
      queryString = params.toString();
    } else if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.per_page)
        searchParams.set("per_page", String(params.per_page));
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);
      queryString = searchParams.toString();
    }

    const endpoint = queryString
      ? `${API_BASE_URL}/brands?${queryString}`
      : `${API_BASE_URL}/brands`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message || `Failed to fetch brands (HTTP ${response.status})`,
      );
    }

    return result;
  },

  // Alias so calling getBrands works seamlessly
  getBrands: async (
    params?: BrandQueryParams | URLSearchParams,
  ): Promise<BrandApiResponse> => {
    return brandsApi.getAll(params);
  },

  create: async (payload: CreateBrandRequest): Promise<CreateBrandResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/brands`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },

  update: async (
    id: number,
    payload: UpdateBrandRequest,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken(); //[cite: 5]

    const response = await fetch(`${API_BASE_URL}/brands/${id}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }), //[cite: 5]
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },
};
