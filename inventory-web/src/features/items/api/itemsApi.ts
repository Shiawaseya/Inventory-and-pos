import { loginApi } from "@/features/authentications/api/loginApi";
import type { Item } from "../types/item";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

function resolveImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${API_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function normalizeItemImages(item: Record<string, unknown>): Item {
  const variants = item.variants;
  return {
    ...item,
    imageUrl: resolveImageUrl(
      typeof item.imageUrl === "string" ? item.imageUrl : null,
    ),
    variants: Array.isArray(variants)
      ? variants.map((variant) => {
          if (!variant || typeof variant !== "object") return variant;
          const variantRecord = variant as Record<string, unknown>;
          return {
            ...variantRecord,
            image_url: resolveImageUrl(
              typeof variantRecord.image_url === "string"
                ? variantRecord.image_url
                : null,
            ),
          };
        })
      : variants,
  } as Item;
}

export type ItemQueryParams = {
  page?: number | string;
  per_page?: number | string;
  search?: string;
  category_id?: number | string;
  brand_id?: number | string;
  is_serialized?: boolean | string;
  sort?: string;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type ItemsApiResponse = {
  success: boolean;
  data: Item[];
  pagination: PaginationMeta;
  filters: {
    search: string | null;
    category_id: number | null;
    brand_id: number | null;
    is_serialized: boolean | null;
    sort: string | null;
  };
  message?: string;
};

export type CreateItemRequest = {
  name: string;
  brand_id?: number | null;
  model?: string | null;
  models?: string[] | null;
  reorder_level?: number | null;
  category_id?: number | null;
  is_serialized?: 0 | 1;
  updated_by?: number | null;
  image?: File | null;
};

type CreateItemResponse = { success: boolean; data?: any; message?: string };

export const itemsApi = {
  create: async (
    payload: CreateItemRequest | FormData,
  ): Promise<CreateItemResponse> => {
    const token = loginApi.getToken();

    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (payload instanceof FormData) {
      body = payload;
    } else {
      const form = new FormData();
      form.append("name", String(payload.name ?? ""));
      if (payload.brand_id != null)
        form.append("brand_id", String(payload.brand_id));
      if (payload.models && Array.isArray(payload.models)) {
        for (const m of payload.models) {
          if (m != null) form.append("models[]", String(m));
        }
        try {
          form.append("models", JSON.stringify(payload.models));
        } catch (e) {
          // ignore
        }
      }
      if (payload.reorder_level != null)
        form.append("reorder_level", String(payload.reorder_level));
      if (payload.category_id != null)
        form.append("category_id", String(payload.category_id));
      if (payload.is_serialized != null)
        form.append("is_serialized", String(payload.is_serialized));
      if (payload.updated_by != null)
        form.append("updated_by", String(payload.updated_by));
      if ((payload as any).image)
        form.append("image", (payload as any).image as File);
      body = form;
    }

    const response = await fetch(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },

  getAll: async (params?: ItemQueryParams): Promise<ItemsApiResponse> => {
    const token = loginApi.getToken();

    // Construct URLSearchParams matching ItemController and ItemRepository
    const searchParams = new URLSearchParams();
    if (params?.page != null) searchParams.set("page", String(params.page));
    if (params?.per_page != null)
      searchParams.set("per_page", String(params.per_page));
    if (params?.search && params.search.trim())
      searchParams.set("search", params.search.trim());
    if (params?.category_id && params.category_id !== "all")
      searchParams.set("category_id", String(params.category_id));
    if (params?.brand_id && params.brand_id !== "all")
      searchParams.set("brand_id", String(params.brand_id));
    if (
      params?.is_serialized !== undefined &&
      params.is_serialized !== "all" &&
      params.is_serialized !== ""
    ) {
      searchParams.set("is_serialized", String(params.is_serialized));
    }
    if (params?.sort && params.sort.trim())
      searchParams.set("sort", params.sort.trim());

    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_BASE_URL}/items?${queryString}`
      : `${API_BASE_URL}/items`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    // Normalise potential response wrappers { status, body } -> use body if present
    const pkg = payload && payload.body ? payload.body : (payload ?? {});

    const fallbackPagination: PaginationMeta = {
      current_page: Number(params?.page ?? 1),
      per_page: Number(params?.per_page ?? 12),
      total_items: 0,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    };

    if (!res.ok) {
      return {
        success: false,
        data: [],
        pagination: pkg.pagination ?? fallbackPagination,
        filters: pkg.filters ?? {
          search: null,
          category_id: null,
          brand_id: null,
          is_serialized: null,
          sort: null,
        },
        message: pkg.message || res.statusText,
      };
    }

    return {
      success: pkg.success ?? true,
      data: Array.isArray(pkg.data) ? pkg.data.map(normalizeItemImages) : [],
      pagination: pkg.pagination ?? fallbackPagination,
      filters: pkg.filters ?? {
        search: null,
        category_id: null,
        brand_id: null,
        is_serialized: null,
        sort: null,
      },
      message: pkg.message,
    };
  },

  getById: async (
    id: number,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return {
      success: true,
      data: Array.isArray(data)
        ? data.map(normalizeItemImages)
        : normalizeItemImages(data),
    };
  },

  update: async (
    id: number,
    payload: Partial<CreateItemRequest>,
  ): Promise<CreateItemResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PUT",
      headers: {
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

  updateForm: async (
    id: number,
    payload: CreateItemRequest | FormData,
  ): Promise<CreateItemResponse> => {
    const token = loginApi.getToken();

    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (payload instanceof FormData) {
      body = payload;
    } else {
      const form = new FormData();
      if ((payload as any).name != null)
        form.append("name", String((payload as any).name));
      if ((payload as any).brand_id != null)
        form.append("brand_id", String((payload as any).brand_id));
      if ((payload as any).category_id != null)
        form.append("category_id", String((payload as any).category_id));
      if ((payload as any).is_serialized != null)
        form.append("is_serialized", String((payload as any).is_serialized));
      if ((payload as any).image)
        form.append("image", (payload as any).image as File);
      body = form;
    }

    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },

  delete: async (
    id: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true };
  },

  uploadImage: async (
    id: number,
    formData: FormData,
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/items/${id}/image`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
  },
};

export default itemsApi;
