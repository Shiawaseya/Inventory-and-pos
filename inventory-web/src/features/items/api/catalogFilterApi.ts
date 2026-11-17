import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type BrandOption = {
  brand_id: number;
  name: string;
  is_active?: boolean;
};
export type CategoryOption = { category_id: number; name: string };

async function fetchList<T>(path: string): Promise<T[]> {
  const token = loginApi.getToken();
  const res = await fetch(`${API_BASE_URL}/${path}?per_page=100`, {
    headers: {
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(
      payload?.message || `Failed to load ${path} (HTTP ${res.status})`,
    );
  }
  return payload.data ?? [];
}

export const catalogFilterApi = {
  getBrands: () => fetchList<BrandOption>("brands"),
  getCategories: () => fetchList<CategoryOption>("categories"),
};

export default catalogFilterApi;
