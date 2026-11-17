const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export type TeamRegistrationRequest = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  contact_number: string;
  pin: string;
  branch_id: number;
  role_id: number;
};

export type TeamRegistrationResponse = {
  success: boolean;
  message?: string;
  token?: string;
  registration?: unknown;
};

export const teamRegistrationApi = {
  register: async (
    payload: TeamRegistrationRequest,
  ): Promise<TeamRegistrationResponse> => {
    const response = await fetch(`${API_BASE_URL}/team/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response
      .json()
      .catch(() => ({}))) as TeamRegistrationResponse;

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || `Registration failed: ${response.statusText}`,
      );
    }

    return data;
  },
};

export default teamRegistrationApi;
