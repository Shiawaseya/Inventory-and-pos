import type {
  LoginCredentials,
  LoginResponse,
  ApiLoginResponse,
  DecodedToken,
} from "../types/login";

// Base API URL - Update this to your actual API endpoint
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

/**
 * Decode token payload (Base64 encoded JSON)
 * Backend uses base64_encode(json_encode($data)) format
 * @param token - Base64 encoded token string
 * @returns Decoded token payload
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    // Backend uses simple base64 encoded JSON
    const jsonPayload = atob(token);
    const decoded = JSON.parse(jsonPayload);
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

function getValidAuthStorage(): Storage | null {
  for (const storage of [localStorage, sessionStorage]) {
    const token = storage.getItem("authToken");
    if (!token) continue;

    const decodedToken = decodeToken(token);
    if (decodedToken?.exp && decodedToken.exp > Math.floor(Date.now() / 1000)) {
      return storage;
    }

    storage.removeItem("authToken");
    storage.removeItem("tokenExpiry");
    storage.removeItem("user");
  }

  return null;
}

/**
 * Login API Service
 * Handles user authentication
 */
export const loginApi = {
  /**
   * Login user with credentials
   * @param credentials - User login credentials
   * @returns Promise with login response
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/team/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      const data: ApiLoginResponse = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: {
            message: data.message || "Login failed",
            code: "LOGIN_FAILED",
          },
        };
      }

      // Decode token to get user info
      const decodedUser = decodeToken(data.token);
      // Store token and user info
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem("authToken", data.token);
      storage.setItem("tokenExpiry", data.expires_in.toString());

      if (decodedUser) {
        storage.setItem("user", JSON.stringify(decodedUser));
        window.dispatchEvent(new CustomEvent("auth-state-changed"));
        console.log(
          "User data stored in",
          credentials.rememberMe ? "localStorage" : "sessionStorage",
        );
      } else {
        console.error("Failed to decode token, user data not stored");
      }

      return {
        success: true,
        data: {
          token: data.token,
          message: data.message,
          expires_in: data.expires_in,
          user: decodedUser || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Network error occurred",
          code: "NETWORK_ERROR",
        },
      };
    }
  },

  /**
   * Logout user
   * Clears stored authentication data
   */
  logout: async (): Promise<void> => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear storage regardless of API call success
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user");
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("tokenExpiry");
      sessionStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("auth-state-changed"));
    }
  },

  /**
   * Check if user is authenticated
   * @returns boolean indicating authentication status
   */
  isAuthenticated: (): boolean => {
    return getValidAuthStorage() !== null;
  },

  /**
   * Get stored authentication token
   * @returns token string or null
   */
  getToken: (): string | null => {
    return getValidAuthStorage()?.getItem("authToken") || null;
  },

  /**
   * Get stored user data
   * @returns user object or null
   */
  getUser: (): DecodedToken | null => {
    const storage = getValidAuthStorage();
    const userStr = storage?.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },
};
