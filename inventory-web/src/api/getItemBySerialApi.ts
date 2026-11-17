import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

/**
 * Fetch an item by serial number
 * @param serial Serial number string
 * @returns Promise with item data or error message
 */
export async function getItemBySerialApi(
  serial: string,
): Promise<{ success: boolean; data?: any; message?: string }> {
  const token = loginApi.getToken();

  const response = await fetch(
    `${API_BASE_URL}/items/by-serial/${encodeURIComponent(serial)}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, message: raw.message || response.statusText };
  }

  // Normalize: always return the item object as data
  const item = raw.data ?? raw;
  return { success: true, data: item };
}
