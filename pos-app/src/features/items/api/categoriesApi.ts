import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type CategoryRecord = {
  category_id: number;
  name: string;
  is_active?: boolean;
  itemCount?: number;
  trend?: string;
  recorded_by?: {
    id: number;
    name: string;
  } | null;
  created_at?: string;
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

export type CategoryApiResponse = {
  success: boolean;
  data: CategoryRecord[];
  links: PaginationLinks;
  pagination: PaginationMeta;
  message?: string;
};

export type CategoryQueryParams = {
  page?: number | string;
  per_page?: number | string;
  sort?: string;
  search?: string;
};

export type CreateCategoryRequest = {
  name: string;
  recorded_by?: number | null;
};

export type CreateCategoryResponse = {
  success: boolean;
  data?: any;
  message?: string;
};

export const categoriesApi = {
  getAll: async (
    params?: CategoryQueryParams,
  ): Promise<CategoryApiResponse> => {
    const token = loginApi.getToken();
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.search) searchParams.set("search", params.search);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `${API_BASE_URL}/categories?${queryString}`
      : `${API_BASE_URL}/categories`;

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
        result?.message ||
          `Failed to fetch categories (HTTP ${response.status})`,
      );
    }

    return result;
  },

  create: async (
    payload: CreateCategoryRequest,
  ): Promise<CreateCategoryResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/categories`, {
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
    payload: UpdateCategoryRequest,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "PUT",
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
};
