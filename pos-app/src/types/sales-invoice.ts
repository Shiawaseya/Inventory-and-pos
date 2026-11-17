export interface Customer {
  id: number;
  full_name: string;
}

export interface Employee {
  id: number;
  name: string;
}

export interface SalesInvoice {
  id: number;
  sales_invoice_number: string;
  date_of_purchase: string | null;
  total_amount: number;
  payment_method: "cash_on_delivery" | "cash_pickup" | string | null;
  status?: string | null;
  reference_note?: string | null;
  customer: Customer | null;
  employee: Employee | null; // Creator of the invoice
  branch_id: number;
  created_at: string | null;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
}

export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export interface SalesInvoiceApiResponse {
  success: boolean;
  data: SalesInvoice[];
  pagination: PaginationMeta;
  links: PaginationLinks;
}
