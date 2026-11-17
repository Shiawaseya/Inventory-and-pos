import { loginApi } from "@/features/authentications/api/loginApi";
import type { StaffListResponse, StaffMember } from "../types/staff";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type EmployeeRecord = Record<string, unknown>;

export type StaffQuery = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?:
    | "id"
    | "first_name"
    | "last_name"
    | "email"
    | "created_at"
    | "status"
    | "position";
  direction?: "asc" | "desc";
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeEmployee(employee: EmployeeRecord): StaffMember {
  const id = employee.id ?? employee.employee_id;
  const firstName = asString(employee.first_name, "");
  const lastName = asString(employee.last_name, "");
  const name = asString(
    employee.name,
    [firstName, lastName].filter(Boolean).join(" "),
  );

  return {
    id: typeof id === "number" || typeof id === "string" ? id : name,
    name: name || "Unnamed employee",
    first_name: firstName,
    middle_name:
      typeof employee.middle_name === "string" ? employee.middle_name : null,
    last_name: lastName,
    position: asString(employee.position ?? employee.role_display_name, "—"),
    role_key: asString(employee.role_key, "—"),
    email:
      typeof employee.email === "string" && employee.email.trim()
        ? employee.email
        : null,
    contact_number:
      typeof employee.contact_number === "string" &&
      employee.contact_number.trim()
        ? employee.contact_number
        : null,
    username: asString(employee.username, "—"),
    is_active: Number(employee.is_active) === 1 ? 1 : 0,
    created_at: asString(employee.created_at, "—"),
    deactivated_at:
      typeof employee.deactivated_at === "string"
        ? employee.deactivated_at
        : null,
    // Fall back to is_active so an inactive employee is never shown as Active.
    status: asString(
      employee.status,
      Number(employee.is_active) === 1 ? "Active" : "Inactive",
    ),
  };
}

export const staffApi = {
  getByBranch: async (
    branchId: number,
    query: StaffQuery = {},
  ): Promise<StaffListResponse> => {
    const token = loginApi.getToken();
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.perPage) params.set("per_page", String(query.perPage));
    if (query.search) params.set("search", query.search);
    if (query.sort) params.set("sort", query.sort);
    if (query.direction) params.set("direction", query.direction);
    const queryString = params.toString();
    const response = await fetch(
      `${API_BASE_URL}/public/employees/branch/${branchId}${queryString ? `?${queryString}` : ""}`,
      {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | {
          success?: boolean;
          data?: unknown;
          message?: string;
          links?: StaffListResponse["links"];
          pagination?: StaffListResponse["pagination"];
        }
      | unknown[]
      | null;

    if (
      !response.ok ||
      (!Array.isArray(payload) && payload?.success === false)
    ) {
      const message =
        payload &&
        !Array.isArray(payload) &&
        typeof payload.message === "string"
          ? payload.message
          : `Failed to fetch staff (HTTP ${response.status})`;
      throw new Error(message);
    }

    const rawEmployees = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.data)
        ? payload.data
        : [];

    return {
      success: true,
      data: rawEmployees
        .filter(
          (employee): employee is EmployeeRecord =>
            typeof employee === "object" && employee !== null,
        )
        .map(normalizeEmployee),
      links: payload && !Array.isArray(payload) ? payload.links : undefined,
      pagination:
        payload && !Array.isArray(payload) ? payload.pagination : undefined,
    };
  },
  setStatus: async (
    employeeId: number | string,
    status: "activate" | "deactivate",
  ): Promise<void> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/public/employees/${employeeId}/${status}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
      throw new Error(
        payload?.message ||
          `Failed to ${status} employee (HTTP ${response.status})`,
      );
    }
  },
  changeRole: async (
    employeeId: number | string,
    roleKey: string,
  ): Promise<void> => {
    const token = loginApi.getToken();
    const response = await fetch(
      `${API_BASE_URL}/public/employees/${employeeId}/role`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({ role_key: roleKey }),
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
      throw new Error(
        payload?.message || `Failed to change role (HTTP ${response.status})`,
      );
    }
  },
};

export default staffApi;
