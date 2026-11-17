import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loginApi } from "../api/loginApi";
import type { LoginCredentials, LoginError } from "../types/login";

export function useLogin(onSuccess?: (data: any) => void) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginApi.login(credentials);

      if (!response.success && response.error) {
        setError(response.error);
        return { success: false, error: response.error };
      }

      return { success: true, data: response.data };
    } catch (err) {
      const errorObj: LoginError = {
        message:
          err instanceof Error ? err.message : "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      };
      setError(errorObj);
      return { success: false, error: errorObj };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError({
        message: "Username and password are required",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const result = await login({
      username,
      password,
      rememberMe,
    });

    if (result.success) {
      // Call success callback if provided
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      navigate({ to: "/checkout" });
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // Form state
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,

    // Actions
    handleSubmit,
    login,
    clearError,

    // Status
    isLoading,
    error,
  };
}
