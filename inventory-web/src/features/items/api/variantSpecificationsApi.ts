import { loginApi } from "@/features/authentications/api/loginApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";
const REQUEST_TIMEOUT_MS = 10000;

export type SpecificationDataType = "option" | "numeric" | "text";

export type ItemAttribute = {
  attribute_id: number;
  name: string;
  data_type: SpecificationDataType;
};

export type AttributeOption = {
  option_id: number;
  attribute_id?: number;
  option_value: string;
};

export type AttributeUnit = {
  unit_id: number;
  symbol: string;
  name?: string;
};

export type VariantSpecification = {
  attribute_id: number;
  name?: string;
  attribute_name?: string;
  data_type: SpecificationDataType;
  option_id?: number | null;
  option_value?: string | null;
  numeric_value?: string | number | null;
  unit_id?: number | null;
  unit?: AttributeUnit | null;
  text_value?: string | null;
};

export type SpecificationPayload =
  | { attribute_id: number; option_id: number }
  | { attribute_id: number; numeric_value: string; unit_id?: number }
  | { attribute_id: number; text_value: string };

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  status?: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = loginApi.getToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const payload = await response.json().catch(() => ({}));
    const body = payload?.body ?? payload;
    const message =
      body?.message ||
      (response.status === 400
        ? "The specification could not be saved. Check the entered values."
        : response.status === 401
          ? "Your session has expired. Please sign in again."
          : response.status === 404
            ? "The requested variant or specification was not found."
            : response.status >= 500
              ? "The server could not complete this request. Please try again."
              : response.statusText);

    if (!response.ok || body?.success === false) {
      return { success: false, message, status: response.status };
    }

    return {
      success: true,
      data: body?.data ?? body,
      message: body?.message,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof DOMException && error.name === "AbortError"
          ? "The request timed out. Please try again."
          : "Unable to reach the server. Check your connection and try again.",
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const variantSpecificationsApi = {
  getAttributes: () => request<ItemAttribute[]>("/item-attributes"),

  createAttribute: (payload: {
    name: string;
    data_type: SpecificationDataType;
  }) =>
    request<ItemAttribute>("/item-attributes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAttribute: (attributeId: number, payload: { name: string }) =>
    request<ItemAttribute>(
      `/item-attributes/${encodeURIComponent(String(attributeId))}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  deleteAttribute: (attributeId: number) =>
    request<void>(
      `/item-attributes/${encodeURIComponent(String(attributeId))}`,
      { method: "DELETE" },
    ),

  getOptions: (attributeId: number) =>
    request<AttributeOption[]>(
      `/attribute-options?attribute_id=${encodeURIComponent(String(attributeId))}`,
    ),

  createOption: (payload: { attribute_id: number; option_value: string }) =>
    request<AttributeOption>("/attribute-options", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateOption: (optionId: number, payload: { option_value: string }) =>
    request<AttributeOption>(
      `/attribute-options/${encodeURIComponent(String(optionId))}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  deleteOption: (optionId: number) =>
    request<void>(
      `/attribute-options/${encodeURIComponent(String(optionId))}`,
      { method: "DELETE" },
    ),

  getUnits: () => request<AttributeUnit[]>("/attribute-units"),

  createUnit: (payload: { symbol: string; name: string }) =>
    request<AttributeUnit>("/attribute-units", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUnit: (unitId: number, payload: { symbol: string; name: string }) =>
    request<AttributeUnit>(
      `/attribute-units/${encodeURIComponent(String(unitId))}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  deleteUnit: (unitId: number) =>
    request<void>(`/attribute-units/${encodeURIComponent(String(unitId))}`, {
      method: "DELETE",
    }),

  getByVariant: (variantId: number) =>
    request<VariantSpecification[]>(
      `/variants/${encodeURIComponent(String(variantId))}/specifications`,
    ),

  create: (variantId: number, payload: SpecificationPayload) =>
    request<VariantSpecification>(
      `/variants/${encodeURIComponent(String(variantId))}/specifications`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  update: (
    variantId: number,
    attributeId: number,
    payload: SpecificationPayload,
  ) =>
    request<VariantSpecification>(
      `/variants/${encodeURIComponent(String(variantId))}/specifications/${encodeURIComponent(String(attributeId))}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  remove: (variantId: number, attributeId: number) =>
    request<void>(
      `/variants/${encodeURIComponent(String(variantId))}/specifications/${encodeURIComponent(String(attributeId))}`,
      { method: "DELETE" },
    ),
};
