import { loginApi } from "@/features/authentications/api/loginApi";
import type {
  ApiResponse,
  RequestOtpPayload,
  VerifyOtpPayload,
} from "../types/profile";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export const profileApi = {
  requestOtp: async (payload: RequestOtpPayload): Promise<ApiResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/employee/account/request-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Failed to send OTP.");
    }

    return data;
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<ApiResponse> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/employee/account/verify-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "OTP verification failed.");
    }

    return data;
  },
};
