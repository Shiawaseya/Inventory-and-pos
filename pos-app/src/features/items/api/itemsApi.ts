import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type CreateItemRequest = {
  name: string;
  brand_id?: number | null;
  model?: string | null;
  models?: string[] | null;
  reorder_level?: number | null;
  category_id?: number | null;
  is_serialized?: 0 | 1;
  updated_by?: number | null;
  // optional file when sending multipart
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
      // do not set Content-Type when sending FormData
    } else {
      // convert object payload to FormData so files can be sent together
      const form = new FormData();
      form.append("name", String(payload.name ?? ""));
      if (payload.brand_id != null)
        form.append("brand_id", String(payload.brand_id));
      if (payload.models && Array.isArray(payload.models)) {
        // append as repeated fields for traditional PHP-style parsing
        for (const m of payload.models) {
          if (m != null) form.append("models[]", String(m));
        }
        // also append a JSON string so backends that expect a JSON array receive it
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
  getAll: async (): Promise<{
    success: boolean;
    data: any[];
    message?: string;
  }> => {
    const token = loginApi.getToken();
    const res = await fetch(`${API_BASE_URL}/items`, {
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

    // normalise wrapper { status, body } -> use body
    const pkg = payload && payload.body ? payload.body : (payload ?? {});

    if (!res.ok) {
      return {
        success: false,
        data: [],
        message: pkg.message || res.statusText,
      };
    }

    return {
      success: pkg.success ?? true,
      data: pkg.data ?? [],
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
    console.log("Fetched item:", data);
    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true, data };
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
      // do not set Content-Type when sending FormData
    } else {
      // convert object payload to FormData
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
        // DO NOT set Content-Type for FormData; browser will set boundary
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
