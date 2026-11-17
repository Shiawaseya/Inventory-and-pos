import { useState } from "react";
import {
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  isRouteErrorResponse,
  useRouteError,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { employeeApi } from "@/api/employeeApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  type SalesInvoiceApiResponse,
  type SalesInvoice,
  type SalesInvoiceStatus,
} from "@/types/sales-invoice";
import {
  GenericDataTable,
  type ColumnDef,
} from "@/components/ui/generic-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Printer,
  User,
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { SalesInvoiceFilters } from "../components/SalesInvoiceFilters";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

async function fetchInvoices(
  branchId: number,
  searchParams: URLSearchParams,
): Promise<SalesInvoiceApiResponse> {
  const token = loginApi.getToken();
  const params = new URLSearchParams(searchParams);

  if (!params.has("page")) params.set("page", "1");
  if (!params.has("per_page")) params.set("per_page", "10");

  const response = await fetch(
    `${API_BASE_URL}/public/sales-invoices/branch/${branchId}?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Response("Failed to fetch sales invoices from API", {
      status: response.status,
    });
  }

  return response.json();
}

// React Router Loader
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const branchId = parseInt(params.branchId || "1", 10);

  const [invoicesResponse, employeesResult] = await Promise.all([
    fetchInvoices(branchId, url.searchParams),
    employeeApi.getSalesRepresentativesByBranch(branchId),
  ]);

  return {
    invoices: invoicesResponse,
    employees: employeesResult.data || [],
  };
}

function formatCurrency(amount: number, currency: string = "PHP"): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatStatus(status: SalesInvoiceStatus): string {
  return status.replace(/_/g, " ");
}

export default function SalesInvoicesRoute() {
  const { invoices, employees } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoading = navigation.state === "loading";
  const [printingId, setPrintingId] = useState<number | null>(null);

  const currentSort = searchParams.get("sort") || "";

  // Call the reprint endpoint
  const handlePrint = async (invoice: SalesInvoice) => {
    setPrintingId(invoice.id);
    const token = loginApi.getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/sales/${invoice.id}/reprint`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: "{}",
        },
      );

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Failed to spool print job");
      }

      toast.success(`Invoice ${invoice.sales_invoice_number} sent to printer.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reach printer service.");
    } finally {
      setPrintingId(null);
    }
  };

  // Handles sort toggling: ASC -> DESC -> CLEAR
  const handleSort = (fieldKey: string) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      const activeSort = nextParams.get("sort");

      if (activeSort === fieldKey) {
        nextParams.set("sort", `-${fieldKey}`);
      } else if (activeSort === `-${fieldKey}`) {
        nextParams.delete("sort");
      } else {
        nextParams.set("sort", fieldKey);
      }

      nextParams.set("page", "1");
      return nextParams;
    });
  };

  // Reusable sortable header component
  const SortableHeader = ({
    title,
    fieldKey,
    align = "left",
  }: {
    title: string;
    fieldKey: string;
    align?: "left" | "right" | "center";
  }) => {
    const isAsc = currentSort === fieldKey;
    const isDesc = currentSort === `-${fieldKey}`;

    return (
      <Button
        variant="ghost"
        size="sm"
        className={`-ml-3 h-8 data-[state=open]:bg-accent ${
          align === "right" ? "ml-auto" : ""
        }`}
        onClick={() => handleSort(fieldKey)}
      >
        <span>{title}</span>
        {isAsc ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : isDesc ? (
          <ArrowDown className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
        )}
      </Button>
    );
  };

  const columns: ColumnDef<SalesInvoice>[] = [
    {
      header: "Invoice No.",
      className: "font-mono font-medium text-xs sm:text-sm",
      cell: (item) => item.sales_invoice_number,
    },
    {
      header: "Customer",
      cell: (item) =>
        item.customer ? (
          <div className="flex items-center gap-1.5 font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{item.customer.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Walk-in</span>
        ),
    },
    {
      header: "Created By",
      cell: (item) =>
        item.employee ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{item.employee.name}</span>
            <span className="text-[11px] text-muted-foreground">
              ID: #{item.employee.id}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">System</span>
        ),
    },
    {
      header: (
        <SortableHeader title="Date of Purchase" fieldKey="date_of_purchase" />
      ),
      className: "text-muted-foreground",
      cell: (item) => item.date_of_purchase ?? "—",
    },
    {
      header: "Payment Method",
      cell: (item) => {
        if (!item.payment_method) {
          return (
            <Badge
              variant="outline"
              className="text-muted-foreground border-dashed"
            >
              Not Selected
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="capitalize">
            {item.payment_method.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge variant="outline" className="capitalize">
          {formatStatus(item.status)}
        </Badge>
      ),
    },
    {
      header: (
        <SortableHeader
          title="Total Amount"
          fieldKey="total_amount"
          align="right"
        />
      ),
      headerClassName: "text-right",
      className: "text-right font-semibold",
      cell: (item) => formatCurrency(item.total_amount),
    },
    {
      header: "Actions",
      headerClassName: "text-center w-[70px]",
      className: "text-center",
      cell: (item) => {
        const isCurrentlyPrinting = printingId === item.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isCurrentlyPrinting}
              >
                {isCurrentlyPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => console.log("View invoice:", item.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isCurrentlyPrinting}
                onClick={() => handlePrint(item)}
              >
                <Printer className="mr-2 h-4 w-4" />
                {isCurrentlyPrinting ? "Printing..." : "Print Receipt"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto space-y-4">
      <SalesInvoiceFilters employees={employees} />

      <GenericDataTable
        title="Sales Invoices"
        columns={columns}
        data={invoices.data}
        pagination={{
          current_page: invoices.pagination.current_page,
          per_page: invoices.pagination.per_page,
          total_pages: invoices.pagination.total_pages,
          total_items: invoices.pagination.total_items,
        }}
        links={invoices.links}
        isLoading={isLoading}
        getRowKey={(item) => item.id}
      />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const [, setSearchParams] = useSearchParams();

  let message = "An unexpected error occurred while loading invoices.";
  let status = "Error";

  if (isRouteErrorResponse(error)) {
    status = `${error.status} ${error.statusText}`;
    message = error.data || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center text-center space-y-4">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">{status}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      <Button
        variant="outline"
        onClick={() => setSearchParams({ page: "1" })}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Reset to Page 1
      </Button>
    </div>
  );
}
