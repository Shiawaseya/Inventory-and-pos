import { loginApi } from "@/features/authentications/api/loginApi";
import type {
  ApiResponse,
  CreateAdjustmentPayload,
  GetAdjustmentsParams,
  PaginatedResponse,
  StockAdjustmentRecord,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export const stockAdjustmentApi = {
  /**
   * Fetch stock adjustments by branch ID with pagination & filters
   */
  getByBranch: async (
    branchId: number,
    page: number = 1,
    perPage: number = 10,
    filters: Partial<GetAdjustmentsParams> = {},
  ): Promise<PaginatedResponse<StockAdjustmentRecord>> => {
    const token = loginApi.getToken();

    const queryParams = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([_, val]) => val !== null && val !== undefined && val !== "",
        ),
      ),
    });

    const response = await fetch(
      `${API_BASE_URL}/stock-adjustments/branch/${branchId}?${queryParams.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        data: [],
        message: raw.message || response.statusText,
        links: { self: "", first: "", last: "", prev: null, next: null },
        pagination: {
          total_items: 0,
          total_pages: 1,
          current_page: 1,
          per_page: perPage,
        },
      };
    }

    return raw;
  },

  /**
   * Fetch a single adjustment record with its child items/serials
   */
  getById: async (id: number): Promise<ApiResponse<StockAdjustmentRecord>> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/stock-adjustments/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: raw.message || response.statusText,
        data: null as any,
      };
    }

    return raw;
  },

  /**
   * Create a new atomic stock adjustment
   */
  create: async (
    payload: CreateAdjustmentPayload,
  ): Promise<ApiResponse<StockAdjustmentRecord>> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/stock-adjustments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: raw.message || response.statusText,
        data: null as any,
      };
    }

    return {
      success: true,
      data: raw.data ?? raw,
      message: raw.message,
    };
  },

  /**
   * Search stock unit by serial number
   */
  searchStockUnitBySerial: async (
    serial: string,
  ): Promise<ApiResponse<any>> => {
    const token = loginApi.getToken();

    const response = await fetch(
      `${API_BASE_URL}/stock-units/serial/${encodeURIComponent(serial)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: raw.message || response.statusText,
        data: null,
      };
    }

    return {
      success: true,
      data: raw.data ?? raw,
    };
  },
};
