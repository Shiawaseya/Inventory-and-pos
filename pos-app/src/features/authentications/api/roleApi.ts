import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type Role = {
  id?: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type GetRolesResponse = { success: boolean; data: Role[]; message?: string };
type GetRoleResponse = { success: boolean; data?: Role; message?: string };
type CreateRoleRequest = { name: string; description?: string | null };
type CreateRoleResponse = { success: boolean; data?: any; message?: string };

export const roleApi = {
  getAll: async (): Promise<GetRolesResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/public/roles`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => ({ success: false, data: [] }));

    if (!response.ok) {
      return { success: false, data: [], message: data.message || response.statusText } as GetRolesResponse;
    }

    return data as GetRolesResponse;
  },

  getById: async (id: number): Promise<GetRoleResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/public/roles/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => ({ success: false }));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText } as GetRoleResponse;
    }

    return data as GetRoleResponse;
  },

  create: async (payload: CreateRoleRequest): Promise<CreateRoleResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/public/roles`, {
      method: "POST",
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

  update: async (id: number, payload: Partial<CreateRoleRequest>): Promise<CreateRoleResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/public/roles/${id}`, {
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

  remove: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/public/roles/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: data.message || response.statusText };
    }

    return { success: true };
  },
};

export default roleApi;
