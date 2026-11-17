// features/authentications/api/passwordResetApi.ts
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

interface ApiResult {
  success: boolean;
  message?: string;
  retry_after?: number;
  resend_in?: number;
  reset_token?: string;
}

export class ApiError extends Error {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

async function post(
  path: string,
  body: unknown,
  fallback: string,
): Promise<ApiResult> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new ApiError(data?.message || fallback, data?.retry_after);
  }
  return data;
}

export const passwordResetApi = {
  requestOtp: (email: string) =>
    post("request-otp", { email }, "Failed to send code."),
  verifyOtp: (email: string, otp: string) =>
    post("verify-otp", { email, otp }, "Code verification failed."),
  reset: (p: {
    email: string;
    reset_token: string;
    new_password: string;
    confirm_password: string;
  }) => post("reset", p, "Failed to reset password."),
};
