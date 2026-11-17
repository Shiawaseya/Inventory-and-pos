import { loginApi } from "./loginApi";
import type { TeamOnboardingResponse } from "../types/teamOnboarding";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type DeletePendingOnboardingResponse = {
  success: boolean;
  message?: string;
};

export const teamOnboardingApi = {
  getPendingOnboarding: async (): Promise<TeamOnboardingResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/team/onboarding/pending`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pending onboarding: ${response.statusText}`);
    }
    return response.json() as Promise<TeamOnboardingResponse>;
  },

  deletePendingOnboarding: async (teamOnboardingId: number): Promise<DeletePendingOnboardingResponse> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/team-onboarding/${teamOnboardingId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = (await response.json().catch(() => ({}))) as DeletePendingOnboardingResponse;

    if (!response.ok) {
      throw new Error(data.message || `Failed to delete pending onboarding: ${response.statusText}`);
    }

    return {
      success: data.success ?? true,
      message: data.message,
    };
  },

  approvePendingOnboarding: async (teamOnboardingId: number): Promise<{ success: boolean; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(`${API_BASE_URL}/team/onboarding/${teamOnboardingId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };

    if (!response.ok) {
      throw new Error(data.message || `Failed to approve onboarding: ${response.statusText}`);
    }

    return {
      success: data.success ?? true,
      message: data.message,
    };
  },
};
