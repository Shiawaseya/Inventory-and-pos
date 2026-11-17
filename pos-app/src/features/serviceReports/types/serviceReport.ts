export type ServiceReportLookup = {
  stock_unit_id: number;
  serial_number: string;
  brand: string;
  model: string;
  sales_invoice_id: number;
  invoice_number: string;
  date_of_purchase: string;
  customer: {
    id: number;
    name: string;
    contact_number: string;
    address: string;
  } | null;
};

export type ServiceReport = {
  id: number;
  control_number: string;
  branch_id: number;
  reported_date: string;
  complaint_description: string;
  report_to: string | null;
  asc_name: string | null;
  customer?: ServiceReportLookup["customer"];
  unit?: Pick<
    ServiceReportLookup,
    "stock_unit_id" | "serial_number" | "brand" | "model"
  >;
  invoice?: Pick<
    ServiceReportLookup,
    "sales_invoice_id" | "invoice_number" | "date_of_purchase"
  >;
  prepared_by?: { employee_id?: number; name: string } | null;
  certified_by?: { employee_id?: number; name: string } | null;
  certified_at?: string | null;
  actions?: Array<{
    id: number;
    service_report_id: number;
    action_date: string;
    action_taken: string;
    logged_by: string;
    created_at: string;
  }>;
};

export type CreateServiceReportRequest = {
  branch_id: number;
  stock_unit_id: number;
  sales_invoice_id: number;
  reported_date: string;
  complaint_description: string;
  report_to?: string;
  asc_name?: string;
  control_number?: string;
};

export type AddServiceReportActionRequest = {
  action_date: string;
  action_taken: string;
};

export type ServiceReportListResponse = {
  items: ServiceReport[];
  currentPage?: number;
  lastPage?: number;
  total?: number;
};

export type ServiceReportApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type ServiceReportError = Error & { status?: number };
