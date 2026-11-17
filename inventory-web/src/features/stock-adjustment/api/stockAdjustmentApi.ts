import { loginApi } from "@/features/authentications/api/loginApi";
import type {
  ApiResponse,
  CreateAdjustmentPayload,
  GetAdjustmentsParams,
  PaginatedResponse,
  StockAdjustmentRecord,
  StockUnitStatus,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export const stockAdjustmentApi = {
  listStockUnitsByStatus: async (
    status: StockUnitStatus,
    page = 1,
    perPage = 100,
  ): Promise<ApiResponse<Array<{
    stock_unit_id: number;
    serial_number: string;
    status: StockUnitStatus;
    variant_id: number | null;
    branch_id: number | null;
    product_name?: string | null;
  }>>> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/stock-units/status/${encodeURIComponent(status)}?page=${page}&per_page=${perPage}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );
    const raw = await response.json().catch(() => ({}));
    if (!response.ok || !raw.success) {
      return {
        success: false,
        message: raw.message || response.statusText,
        data: [],
      };
    }
    return { success: true, data: raw.data ?? [] };
  },

  /**
   * Fetch stock adjustments with pagination & filters.
   * If branchId is omitted, the backend extracts it from the JWT token.
   */
  getByBranch: async (
    branchId?: number,
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

    const endpoint = branchId
      ? `${API_BASE_URL}/stock-adjustments/branch/${branchId}?${queryParams.toString()}`
      : `${API_BASE_URL}/stock-adjustments?${queryParams.toString()}`;

    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

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
   * Fetch single adjustment record including item serials
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
    payload: Omit<CreateAdjustmentPayload, "branch_id"> & {
      branch_id?: number;
    },
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
   * Search stock unit by serial number within the user's branch
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
