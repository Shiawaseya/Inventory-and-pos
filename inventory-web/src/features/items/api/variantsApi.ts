import { loginApi } from "@/features/authentications/api/loginApi";
import type { Variant } from "../types/item";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

function resolveImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${API_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export type VariantsResponse = {
  success: boolean;
  data: Variant[];
  message?: string;
};

export const variantsApi = {
  getByItem: async (itemId: number): Promise<VariantsResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/variants?item_id=${encodeURIComponent(String(itemId))}`,
      {
        headers: {
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
      return {
        success: false,
        data: [],
        message: payload?.message || response.statusText,
      };
    }

    return {
      success: true,
      data: (payload?.data ?? []).map((variant: Variant) => ({
        ...variant,
        image_url: resolveImageUrl(variant.image_url),
      })),
      message: payload?.message,
    };
  },

  update: async (
    variantId: number,
    payload: {
      model: string;
      sku: string;
      initial_serial_number?: string | null;
      is_active?: boolean;
      image?: File | null;
    },
  ): Promise<{ success: boolean; data?: Variant; message?: string }> => {
    const token = loginApi.getToken();
    const formData = new FormData();
    formData.append("model", payload.model);
    formData.append("sku", payload.sku);
    if (payload.initial_serial_number !== undefined) {
      formData.append("initial_serial_number", payload.initial_serial_number ?? "");
    }
    if (payload.is_active != null) {
      formData.append("is_active", payload.is_active ? "1" : "0");
    }
    if (payload.image) formData.append("image", payload.image);

    const response = await fetch(`${API_BASE_URL}/variants/${variantId}`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      return {
        success: false,
        message: data?.message || response.statusText,
      };
    }

    return {
      success: true,
      data: data?.data ?? data,
      message: data?.message,
    };
  },
};

export default variantsApi;
