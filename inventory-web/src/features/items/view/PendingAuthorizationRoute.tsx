import { useState } from "react";
import {
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { toast } from "sonner";
import { employeeApi } from "@/api/employeeApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  type SalesInvoiceApiResponse,
  type SalesInvoice,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Loader2,
  MoreHorizontal,
  Printer,
  RotateCcw,
  RotateCw,
  User,
  X,
  BadgeCheck,
  ArrowUpDown,
  Package,
  Calendar,
  CreditCard,
} from "lucide-react";
import { SalesInvoiceFilters } from "../components/SalesInvoiceFilters";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

async function fetchPendingInvoices(
  branchId: number,
  searchParams: URLSearchParams,
): Promise<SalesInvoiceApiResponse> {
  const token = loginApi.getToken();
  const params = new URLSearchParams(searchParams);

  if (!params.has("page")) params.set("page", "1");
  if (!params.has("per_page")) params.set("per_page", "10");
  params.set("status", "pending_authorization");

  const response = await fetch(
    `${API_BASE_URL}/public/sales-invoices/branch/${branchId}?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) {
    throw new Response("Failed to fetch pending authorization invoices", {
      status: response.status,
    });
  }

  return response.json();
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const user = loginApi.getUser();
  const branchId = parseInt(
    params.branchId || String(user?.branchId || "1"),
    10,
  );

  const [invoicesResponse, employeesResult] = await Promise.all([
    fetchPendingInvoices(branchId, url.searchParams),
    employeeApi.getSalesRepresentativesByBranch(branchId),
  ]);

  return {
    invoices: invoicesResponse,
    employees: employeesResult.data || [],
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function PendingAuthorizationRoute() {
  const { invoices, employees } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoading = navigation.state === "loading";

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [voidTarget, setDeleteVoidTarget] = useState<SalesInvoice | null>(null);
  const [authorizedSuccessInvoice, setAuthorizedSuccessInvoice] =
    useState<SalesInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(
    null,
  );
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const currentSort = searchParams.get("sort") || "none";

  const handleAuthorize = async (invoice: SalesInvoice) => {
    setActionLoadingId(invoice.id);
    const token = loginApi.getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/sales/${invoice.id}/authorize`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ isPrint: false }),
        },
      );

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Failed to authorize invoice");
      }

      toast.success(
        `Invoice ${invoice.sales_invoice_number} successfully authorized`,
      );
      if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
      setAuthorizedSuccessInvoice(invoice);
      setIsPrintModalOpen(true);
      revalidator.revalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to authorize invoice");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVoidConfirm = async () => {
    if (!voidTarget) return;
    setActionLoadingId(voidTarget.id);
    const token = loginApi.getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/sales/${voidTarget.id}/void`,
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
        throw new Error(body?.message || "Failed to void invoice");
      }

      toast.success(`Invoice ${voidTarget.sales_invoice_number} voided`);
      if (selectedInvoice?.id === voidTarget.id) setSelectedInvoice(null);
      setDeleteVoidTarget(null);
      revalidator.revalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to void invoice");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePrint = async () => {
    if (!authorizedSuccessInvoice) return;
    const token = loginApi.getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/sales/${authorizedSuccessInvoice.id}/reprint`,
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
      toast.success("Invoice sent to printer");
    } catch (err: any) {
      toast.error(err.message || "Printer communication failed");
    } finally {
      setIsPrintModalOpen(false);
      setAuthorizedSuccessInvoice(null);
    }
  };

  const handleSortSelect = (val: string) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (val === "none") {
        nextParams.delete("sort");
      } else {
        nextParams.set("sort", val);
      }
      nextParams.set("page", "1");
      return nextParams;
    });
  };

  const columns: ColumnDef<SalesInvoice>[] = [
    {
      header: "Invoice",
      className: "font-mono min-w-0 truncate py-3",
      cell: (item) => (
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500 shrink-0" />
            <span className="font-bold tracking-tight text-foreground text-xs sm:text-sm truncate">
              {item.sales_invoice_number}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground truncate lg:hidden mt-0.5">
            {item.customer?.full_name || "Walk-in"} •{" "}
            {item.date_of_purchase ?? "—"}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell min-w-0 py-3",
      cell: (item) =>
        item.customer ? (
          <div className="flex items-center gap-1.5 font-medium min-w-0 text-foreground/90">
            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="size-3.5" />
            </div>
            <span className="truncate">{item.customer.full_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground/80 italic text-xs">
            <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="size-3 text-muted-foreground" />
            </div>
            <span>Walk-in Customer</span>
          </div>
        ),
    },
    {
      header: "Created By",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell min-w-0 py-3",
      cell: (item) =>
        item.employee ? (
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground/90 truncate">
              {item.employee.name}
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-mono">
              Staff #{item.employee.id}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">System</span>
        ),
    },
    {
      header: "Date",
      headerClassName: "hidden md:table-cell w-[115px]",
      className:
        "hidden md:table-cell text-muted-foreground text-xs whitespace-nowrap py-3",
      cell: (item) => item.date_of_purchase ?? "—",
    },
    {
      header: "Payment",
      headerClassName: "hidden 2xl:table-cell w-[130px]",
      className: "hidden 2xl:table-cell whitespace-nowrap py-3",
      cell: (item) => (
        <Badge
          variant="secondary"
          className="capitalize text-[11px] font-medium bg-secondary/70 hover:bg-secondary/90 transition-colors"
        >
          {item.payment_method?.replace(/_/g, " ") || "Cash"}
        </Badge>
      ),
    },
    {
      header: "Status",
      headerClassName: "hidden sm:table-cell w-[130px]",
      className: "hidden sm:table-cell whitespace-nowrap py-3",
      cell: () => (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-medium gap-1 px-2 py-0.5"
        >
          <Clock className="size-3 text-amber-600 dark:text-amber-400" />
          Pending Auth
        </Badge>
      ),
    },
    {
      header: "Total",
      headerClassName: "text-right w-[120px] sm:w-[145px]",
      className:
        "text-right font-bold font-mono text-xs sm:text-sm whitespace-nowrap pl-1 py-3 text-foreground",
      cell: (item) => formatCurrency(item.total_amount),
    },
    {
      header: "Actions",
      headerClassName: "w-[260px] text-right pr-4",
      className: "text-right w-[260px] shrink-0 p-0 pr-3 py-3",
      cell: (item) => {
        const isCurrentLoading = actionLoadingId === item.id;
        return (
          <div className="flex items-center justify-end">
            <div className="hidden sm:flex items-center justify-end gap-2 whitespace-nowrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedInvoice(item)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              >
                <Eye className="size-3.5 mr-1 text-primary" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteVoidTarget(item)}
                disabled={isCurrentLoading}
                className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border shrink-0"
              >
                <Ban className="size-3.5 mr-1" />
                Void
              </Button>
              <Button
                size="sm"
                onClick={() => handleAuthorize(item)}
                disabled={isCurrentLoading}
                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold shrink-0"
              >
                {isCurrentLoading ? (
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="size-3.5 mr-1" />
                )}
                Authorize
              </Button>
            </div>

            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-auto"
                    disabled={isCurrentLoading}
                  >
                    {isCurrentLoading ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 shadow-lg">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Authorize Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2"
                    onClick={() => setSelectedInvoice(item)}
                  >
                    <Eye className="size-4 text-primary" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2 text-emerald-600 dark:text-emerald-400 font-medium"
                    onClick={() => handleAuthorize(item)}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Authorize Invoice</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2 text-destructive font-medium"
                    onClick={() => setDeleteVoidTarget(item)}
                  >
                    <Ban className="size-4" />
                    <span>Void Invoice</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden p-6 custom-scrollbar">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Clock className="size-3.5" />
              {invoices.pagination.total_items} awaiting approval
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pending Authorizations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review, approve, or void pending sales transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => revalidator.revalidate()}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs"
          >
            <RotateCw
              className={
                isLoading ? "size-3.5 animate-spin text-primary" : "size-3.5"
              }
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <SalesInvoiceFilters employees={employees} hideStatusFilter />
          </div>
          <div className="w-full lg:w-[180px] p-3 sm:p-4 pt-0 sm:pt-0 lg:p-0">
            <Select value={currentSort} onValueChange={handleSortSelect}>
              <SelectTrigger className="h-9 text-xs bg-background/80">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="size-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Sort..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default Order</SelectItem>
                <SelectItem value="-date_of_purchase">
                  Date (Newest First)
                </SelectItem>
                <SelectItem value="date_of_purchase">
                  Date (Oldest First)
                </SelectItem>
                <SelectItem value="-total_amount">
                  Amount (Highest First)
                </SelectItem>
                <SelectItem value="total_amount">
                  Amount (Lowest First)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs [&_table]:table-fixed [&_table]:w-full [&_tbody_tr:hover]:bg-accent/40 [&_tbody_tr]:transition-colors">
        <GenericDataTable
          title="All Pending Authorizations"
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

      {/* Details Modal */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/80 shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-5 text-white shrink-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md">
                <Clock className="size-3" /> Awaiting Authorization
              </span>
              <span className="font-mono text-xs opacity-90">
                ID #{selectedInvoice?.id}
              </span>
            </div>
            <DialogTitle className="mt-2.5 font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {selectedInvoice?.sales_invoice_number}
            </DialogTitle>
            <DialogDescription className="text-white/85 text-xs mt-0.5">
              Initiated on {selectedInvoice?.date_of_purchase ?? "Today"}
            </DialogDescription>
          </div>

          {selectedInvoice && (
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/70 p-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </span>
                  <div className="font-mono text-2xl font-extrabold text-foreground tracking-tight">
                    {formatCurrency(selectedInvoice.total_amount)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold"
                >
                  Pending Authorization
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <User className="size-3 text-primary" /> Customer
                  </span>
                  <p className="mt-1 font-semibold text-foreground truncate">
                    {selectedInvoice.customer?.full_name || "Walk-in Customer"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <BadgeCheck className="size-3 text-primary" /> Created By
                  </span>
                  <p className="mt-1 font-semibold text-foreground truncate">
                    {selectedInvoice.employee?.name || "System"}
                  </p>
                  {selectedInvoice.employee?.id && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Staff ID #{selectedInvoice.employee.id}
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-primary" /> Date of Sale
                  </span>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedInvoice.date_of_purchase ?? "—"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <CreditCard className="size-3 text-primary" /> Payment
                    Method
                  </span>
                  <p className="mt-1 font-semibold text-foreground capitalize">
                    {selectedInvoice.payment_method?.replace(/_/g, " ") ||
                      "Cash"}
                  </p>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" /> Items Ordered
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {selectedInvoice.items?.length ?? 0} item
                    {(selectedInvoice.items?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 bg-card/40">
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item) => (
                      <div
                        key={item.detail_id}
                        className="p-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-foreground leading-tight">
                            {item.item_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-mono">
                            {item.model && <span>Model: {item.model}</span>}
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.serial_number && (
                              <span>SN: {item.serial_number}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-foreground shrink-0">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                      No items found for this invoice.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-muted/30 px-6 py-3.5 border-t border-border/60 gap-2 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setSelectedInvoice(null)}
              className="text-xs h-9"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const target = selectedInvoice;
                setSelectedInvoice(null);
                if (target) setDeleteVoidTarget(target);
              }}
              className="text-xs h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban className="size-3.5 mr-1" />
              Void
            </Button>
            <Button
              onClick={() => {
                const target = selectedInvoice;
                if (target) handleAuthorize(target);
              }}
              className="flex-1 text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
            >
              <CheckCircle2 className="size-3.5" />
              Authorize Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Modal */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setDeleteVoidTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Ban className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Void Pending Invoice?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Are you sure you want to void invoice{" "}
              <span className="font-semibold text-foreground font-mono">
                {voidTarget?.sales_invoice_number}
              </span>
              ? All reserved serials and inventory will be returned to available
              stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteVoidTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={actionLoadingId === voidTarget?.id}
              className="flex-1 font-semibold"
            >
              {actionLoadingId === voidTarget?.id ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Confirmation Modal */}
      <Dialog
        open={isPrintModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPrintModalOpen(false);
            setAuthorizedSuccessInvoice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FileCheck2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Transaction Authorized
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Invoice{" "}
              <span className="font-mono font-semibold text-foreground">
                {authorizedSuccessInvoice?.sales_invoice_number}
              </span>{" "}
              has been approved. Would you like to print the official sales
              invoice?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPrintModalOpen(false);
                setAuthorizedSuccessInvoice(null);
              }}
              className="flex-1 gap-1.5"
            >
              <X className="size-4" />
              Don&apos;t Print
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="flex-1 gap-1.5 bg-[#1d6b50] hover:bg-[#16533e] text-white shadow-xs font-semibold"
            >
              <Printer className="size-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const [, setSearchParams] = useSearchParams();

  let message =
    "An unexpected error occurred while loading pending authorizations.";
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
