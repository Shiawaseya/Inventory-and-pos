import { loginApi } from "@/features/authentications/api/loginApi";
import { LoaderFunctionArgs, useLoaderData, useNavigation } from "react-router";
import { SalesInvoiceApiResponse } from "@/types/sales-invoice";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

async function fetchInvoices(
  branchId: number,
  page: number,
  perPage: number = 10,
): Promise<SalesInvoiceApiResponse> {
  const token = loginApi.getToken();
  const response = await fetch(
    `${API_BASE_URL}/api/sales-invoices/branch/${branchId}?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch sales invoices");
  }

  return response.json();
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage = parseInt(url.searchParams.get("per_page") || "10", 10);
  const branchId = parseInt(params.branchId || "1", 10);

  const data = await fetchInvoices(branchId, page, perPage);
  return data;
}
