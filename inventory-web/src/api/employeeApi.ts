import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

export interface SalesRepresentative {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
}

export const employeeApi = {
  /**
   * Fetch sales representatives for a branch
   */
  getSalesRepresentativesByBranch: async (
    branchId: number,
  ): Promise<{
    success: boolean;
    data: SalesRepresentative[];
    message?: string;
  }> => {
    const token = loginApi.getToken();

    const response = await fetch(
      `${API_BASE_URL}/public/employees/sales-representatives/branch/${branchId}`,
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
      };
    }

    const rawList = Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];

    // Normalize name formatting
    const normalizedData = rawList.map((emp: any) => ({
      id: emp.id ?? emp.employee_id,
      name:
        emp.name ||
        [emp.first_name, emp.middle_name, emp.last_name]
          .filter(Boolean)
          .join(" ") ||
        `Employee #${emp.id ?? emp.employee_id}`,
    }));

    return { success: true, data: normalizedData };
  },

  getById: async (
    id: number,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = loginApi.getToken();

    const response = await fetch(
      `${API_BASE_URL}/employees/sales-representatives/${id}`,
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

    const employee = raw.data ?? raw;
    return { success: true, data: employee };
  },
};
