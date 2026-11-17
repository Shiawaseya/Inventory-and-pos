import { loginApi } from "@/features/authentications/api/loginApi";
import type {
  CreateServiceReportRequest,
  AddServiceReportActionRequest,
  ServiceReport,
  ServiceReportApiResponse,
  ServiceReportLookup,
  ServiceReportError,
  ServiceReportListResponse,
} from "../types/serviceReport";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

function requestHeaders(): HeadersInit {
  const token = loginApi.getToken();
  if (!token) {
    const error = new Error(
      "Your session has expired. Please sign in again.",
    ) as ServiceReportError;
    error.status = 401;
    throw error;
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function defaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "The service report data is invalid or conflicts with an existing report.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this service report action.";
    case 404:
      return "The requested service report or lookup result was not found.";
    case 500:
      return "The service report service is unavailable. Please try again later.";
    default:
      return `Request failed with status ${status}`;
  }
}

async function parseResponse<T>(
  response: Response,
): Promise<ServiceReportApiResponse<T>> {
  const body = (await response
    .json()
    .catch(() => ({}))) as ServiceReportApiResponse<T>;
  if (!response.ok || !body.success) {
    const error = new Error(
      body.message || defaultErrorMessage(response.status),
    ) as ServiceReportError;
    error.status = response.status;
    throw error;
  }
  return body;
}

export const serviceReportsApi = {
  lookup: async (searchTerm: string): Promise<ServiceReportLookup> => {
    const response = await fetch(
      `${API_BASE_URL}/service-reports/lookup?q=${encodeURIComponent(searchTerm.trim())}`,
      { headers: requestHeaders() },
    );
    const body = await parseResponse<ServiceReportLookup>(response);
    if (!body.data)
      throw new Error("The lookup response did not include a result.");
    return body.data;
  },

  create: async (
    payload: CreateServiceReportRequest,
  ): Promise<ServiceReport> => {
    const response = await fetch(`${API_BASE_URL}/service-reports`, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await parseResponse<ServiceReport>(response);
    if (!body.data)
      throw new Error("The create response did not include the report.");
    return body.data;
  },

  getById: async (id: number): Promise<ServiceReport> => {
    const response = await fetch(`${API_BASE_URL}/service-reports/${id}`, {
      headers: requestHeaders(),
    });
    const body = await parseResponse<ServiceReport>(response);
    if (!body.data)
      throw new Error("The detail response did not include the report.");
    return body.data;
  },

  getByBranch: async (
    branchId: number,
    page = 1,
  ): Promise<ServiceReportListResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/service-reports/branch/${branchId}?page=${page}`,
      { headers: requestHeaders() },
    );
    const body = await parseResponse<
      | ServiceReport[]
      | {
          data?: ServiceReport[];
          current_page?: number;
          last_page?: number;
          total?: number;
        }
    >(response);
    const data = body.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        currentPage: page,
        lastPage: 1,
        total: data.length,
      };
    }
    return {
      items: data?.data ?? [],
      currentPage: data?.current_page ?? page,
      lastPage: data?.last_page ?? page,
      total: data?.total,
    };
  },

  certify: async (id: number): Promise<ServiceReport> => {
    const response = await fetch(
      `${API_BASE_URL}/service-reports/${id}/certify`,
      {
        method: "POST",
        headers: requestHeaders(),
        body: "{}",
      },
    );
    const body = await parseResponse<ServiceReport>(response);
    if (!body.data)
      throw new Error("The certification response did not include the report.");
    return body.data;
  },

  addAction: async (
    id: number,
    payload: AddServiceReportActionRequest,
  ): Promise<ServiceReport> => {
    const response = await fetch(
      `${API_BASE_URL}/service-reports/${id}/actions`,
      {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify(payload),
      },
    );
    const body = await parseResponse<ServiceReport>(response);
    if (!body.data)
      throw new Error("The action response did not include the report.");
    return body.data;
  },
};

export default serviceReportsApi;
