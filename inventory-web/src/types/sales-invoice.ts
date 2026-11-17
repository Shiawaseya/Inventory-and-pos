export interface Customer {
  id: number;
  full_name: string;
}

export interface Employee {
  id: number;
  name: string;
}

export type SalesInvoiceStatus =
  | "completed"
  | "parked"
  | "pending_authorization"
  | "authorized"
  | "rejected"
  | "voided";

export interface InvoiceFinancing {
  financing_id: number;
  provider: string;
  loan_account_number: string;
  financed_amount: number;
  downpayment_amount: number;
  approved_date: string;
  status: "approved" | "cancelled";
}

export interface InvoiceSettlement {
  settlement_id: number;
  driver_name: string | null;
  amount_due: number;
  amount_remitted: number;
  remitted_at: string;
  conforme_received: boolean;
}

export interface SalesInvoice {
  id: number;
  sales_invoice_number: string;
  date_of_purchase: string | null;
  total_amount: number;
  payment_method:
    "cash_on_delivery" | "cash_pickup" | "home_credit" | string | null;
  status: SalesInvoiceStatus;
  customer: Customer | null;
  employee: Employee | null; // Creator of the invoice
  branch_id: number;
  created_at: string | null;
  // Present only if the sales-invoices endpoint includes them
  financing?: InvoiceFinancing | null;
  settlement?: InvoiceSettlement | null;
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
