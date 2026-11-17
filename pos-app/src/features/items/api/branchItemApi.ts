import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type SetBranchItemPayload = {
  item_id?: number;
  variant_id?: number;
  price?: number | null;
  reorder_level?: number | null;
};

export const branchItemApi = {
  set: async (
    payload: SetBranchItemPayload,
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    status?: number;
  }> => {
    const token = loginApi.getToken();
    console.log("Setting branch item with payload:", payload);
    const response = await fetch(`${API_BASE_URL}/branch-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Log server error for debugging
      console.error("branchItemApi.set failed", {
        status: response.status,
        body: data,
      });
      return {
        success: false,
        message: data.message || response.statusText,
        status: response.status,
      };
    }

    return { success: true, data };
  },

  getForItem: async (
    itemId: number,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();

    const res = await fetch(
      `${API_BASE_URL}/branch-items?item_id=${encodeURIComponent(itemId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, message: payload.message || res.statusText };
    }

    return { success: true, data: payload };
  },

  delete: async (
    id: number,
  ): Promise<{ success: boolean; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/branch-items/${id}`, {
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
};

export default branchItemApi;
