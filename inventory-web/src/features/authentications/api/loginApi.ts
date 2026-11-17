import type {
  LoginCredentials,
  LoginResponse,
  ApiLoginResponse,
  DecodedToken,
} from "../types/login";

// Base API URL - Update this to your actual API endpoint
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

function clearStoredAuthentication(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem("authToken");
    storage.removeItem("tokenExpiry");
    storage.removeItem("user");
  }
}

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
    console.log("Decoded token payload:", decoded);
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

function getStoredToken(): string | null {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}

function isStoredTokenValid(): boolean {
  const token = getStoredToken();
  if (!token) return false;

  const user = loginApi.getUser();
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (user?.exp && user.exp <= nowInSeconds) {
    clearStoredAuthentication();
    return false;
  }

  const expiry = Number(
    localStorage.getItem("tokenExpiry") ||
      sessionStorage.getItem("tokenExpiry"),
  );

  if (
    Number.isFinite(expiry) &&
    expiry > 1_000_000_000_000 &&
    expiry <= Date.now()
  ) {
    clearStoredAuthentication();
    return false;
  }

  return true;
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
      const response = await fetch(`${API_BASE_URL}/login`, {
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
      console.log("Login successful. Decoded user:", decodedUser);

      // Avoid stale credentials when switching between remember-me modes.
      clearStoredAuthentication();

      // Store token and user info
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem("authToken", data.token);
      storage.setItem(
        "tokenExpiry",
        String(Date.now() + data.expires_in * 1000),
      );

      if (decodedUser) {
        storage.setItem("user", JSON.stringify(decodedUser));
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
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    clearStoredAuthentication();

    try {
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
    }
  },

  /**
   * Check if user is authenticated
   * @returns boolean indicating authentication status
   */
  isAuthenticated: (): boolean => {
    return isStoredTokenValid();
  },

  /**
   * Get stored authentication token
   * @returns token string or null
   */
  getToken: (): string | null => {
    return isStoredTokenValid() ? getStoredToken() : null;
  },

  /**
   * Get stored user data
   * @returns user object or null
   */
  getUser: (): DecodedToken | null => {
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
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
