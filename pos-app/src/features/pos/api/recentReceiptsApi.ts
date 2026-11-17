import { loginApi } from "@/features/authentications/api/loginApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SalesInvoiceDetailItem = {
  detail_id: number;
  quantity: number;
  unit_price: number;
  item_name: string;
  model: string;
  sku: string;
  serial_number: string | null;
  stock_unit_id: number | null;
  inventory_id: number | null;
};

export type SalesInvoiceParty = {
  id: number;
  name?: string;
  full_name?: string;
};

export type RecentReceipt = {
  id: number;
  sales_invoice_number: string;
  date_of_purchase: string | null;
  total_amount: number;
  payment_method: string;
  status: string;
  reference_note: string | null;
  items: SalesInvoiceDetailItem[];
  customer: SalesInvoiceParty | null;
  employee: SalesInvoiceParty | null;
  authorized_by: SalesInvoiceParty | null;
  authorized_at: string | null;
  branch_id: number;
  created_at: string | null;
};

export type RecentReceiptsSearchParams = {
  branchId: number;
  search?: string;
  salesInvoiceNumber?: string;
  status?: string;
  customerId?: number;
  customerSearch?: string;
  createdAt?: string;
  sort?: "date_desc" | "date_asc" | "total_amount_desc" | "total_amount_asc";
  page?: number;
  perPage?: number;
};

export type RecentReceiptsResponse = {
  success: boolean;
  data: RecentReceipt[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
};

/* ------------------------------------------------------------------ */
/* HTTP adapter                                                       */
/* ------------------------------------------------------------------ */

async function get<T>(path: string, params: URLSearchParams): Promise<T> {
  const base = import.meta.env.VITE_API_URL ?? "";
  const token = (loginApi as any).getToken?.() ?? localStorage.getItem("token");
  const queryString = params.toString();
  const url = `${base}${path}${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const rawText = await res.text();
  let json: any = {};

  try {
    // Strips out any PHP warnings/notices printed before the opening JSON object
    const jsonStartIndex = rawText.indexOf("{");
    if (jsonStartIndex !== -1) {
      json = JSON.parse(rawText.slice(jsonStartIndex));
    } else {
      json = JSON.parse(rawText);
    }
  } catch {
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message ?? "Request failed");
  }
  return json as T;
}

/* ------------------------------------------------------------------ */
/* Query building                                                      */
/* ------------------------------------------------------------------ */

function buildParams(p: RecentReceiptsSearchParams): URLSearchParams {
  const q = new URLSearchParams();

  if (p.search?.trim()) q.set("search", p.search.trim());
  if (p.salesInvoiceNumber?.trim())
    q.set("sales_invoice_number", p.salesInvoiceNumber.trim());
  if (p.status?.trim()) q.set("status", p.status.trim());
  if (p.customerId) q.set("customer_id", String(p.customerId));
  if (p.customerSearch?.trim())
    q.set("customer_search", p.customerSearch.trim());
  if (p.createdAt?.trim()) q.set("created_at", p.createdAt.trim());

  // Send single string format (field:direction) expected by SortableRepositoryTrait
  if (p.sort === "date_asc") {
    q.set("sort", "date_of_purchase:asc");
  } else if (p.sort === "date_desc") {
    q.set("sort", "date_of_purchase:desc");
  } else if (p.sort === "total_amount_asc") {
    q.set("sort", "total_amount:asc");
  } else if (p.sort === "total_amount_desc") {
    q.set("sort", "total_amount:desc");
  } else if (p.sort) {
    q.set("sort", p.sort);
  }

  q.set("page", String(p.page ?? 1));
  q.set("per_page", String(p.perPage ?? 12));

  return q;
}

/* ------------------------------------------------------------------ */
/* API methods                                                        */
/* ------------------------------------------------------------------ */

export const recentReceiptsApi = {
  list: (params: RecentReceiptsSearchParams) =>
    get<RecentReceiptsResponse>(
      `/sales-invoices/branch/${params.branchId}/employee`,
      buildParams(params),
    ),
};
