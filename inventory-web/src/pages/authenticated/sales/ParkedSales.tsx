import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  Calendar,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck2,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Printer,
  RotateCw,
  User,
  X,
  BadgeCheck,
  ArrowUpDown,
  Package,
} from "lucide-react";
import { loginApi } from "@/features/authentications/api/loginApi";
import { employeeApi } from "@/api/employeeApi";
import type {
  SalesInvoice,
  SalesInvoiceApiResponse,
} from "@/types/sales-invoice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GenericDataTable,
  type ColumnDef,
} from "@/components/ui/generic-data-table";
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
import { SalesInvoiceFilters } from "@/features/items/components/SalesInvoiceFilters";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

async function fetchParkedSales(
  searchParams: URLSearchParams,
): Promise<SalesInvoiceApiResponse> {
  const token = loginApi.getToken();
  const params = new URLSearchParams(searchParams);

  if (!params.has("page")) params.set("page", "1");
  if (!params.has("per_page")) params.set("per_page", "10");

  const response = await fetch(
    `${API_BASE_URL}/public/sales-invoices/parked?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(
      body?.message || `Unable to load parked sales (HTTP ${response.status})`,
    );
  }

  return body;
}

export default function ParkedSales() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedSale, setSelectedSale] = useState<SalesInvoice | null>(null);
  const [voidTarget, setVoidTarget] = useState<SalesInvoice | null>(null);
  const [authorizedSuccessInvoice, setAuthorizedSuccessInvoice] =
    useState<SalesInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const currentSort = searchParams.get("sort") || "none";
  const user = loginApi.getUser();
  const branchId = parseInt(String(user?.branchId || "1"), 10);

  // Load branch employees for the filter dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["branch-sales-reps", branchId],
    queryFn: () => employeeApi.getSalesRepresentativesByBranch(branchId),
    refetchOnWindowFocus: false,
  });
  const employees = employeesData?.data || [];

  // Server-side paginated and filtered parked sales query
  const {
    data: response,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["parked-sales", searchParams.toString()],
    queryFn: () => fetchParkedSales(searchParams),
    refetchOnWindowFocus: false,
  });

  const sales = response?.data ?? [];

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

  const handleAuthorize = async (sale: SalesInvoice) => {
    setActionLoadingId(sale.id);
    const token = loginApi.getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/sales/${sale.id}/authorize`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ isPrint: false }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "Failed to authorize sale");
      }

      toast.success(`Invoice ${sale.sales_invoice_number} authorized`);
      if (selectedSale?.id === sale.id) setSelectedSale(null);
      setAuthorizedSuccessInvoice(sale);
      setIsPrintModalOpen(true);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to authorize sale");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVoidConfirm = async () => {
    if (!voidTarget) return;
    setActionLoadingId(voidTarget.id);
    const token = loginApi.getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/sales/${voidTarget.id}/void`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: "{}",
      });

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "Failed to void sale");
      }

      toast.success(`Invoice ${voidTarget.sales_invoice_number} voided`);
      if (selectedSale?.id === voidTarget.id) setSelectedSale(null);
      setVoidTarget(null);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to void sale");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePrint = async () => {
    if (!authorizedSuccessInvoice) return;
    const token = loginApi.getToken();

    try {
      const res = await fetch(
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

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "Failed to reach printer");
      }

      toast.success("Invoice sent to printer");
    } catch (err: any) {
      toast.error(err.message || "Printer communication failed");
    } finally {
      setIsPrintModalOpen(false);
      setAuthorizedSuccessInvoice(null);
    }
  };

  const columns: ColumnDef<SalesInvoice>[] = [
    {
      header: "Invoice",
      className: "font-mono min-w-0 truncate py-3",
      cell: (sale) => (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 font-mono font-bold tracking-tight text-foreground text-xs sm:text-sm truncate">
            <PauseCircle className="size-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{sale.sales_invoice_number}</span>
          </div>
          <span className="text-[11px] text-muted-foreground truncate lg:hidden mt-0.5">
            {sale.customer?.full_name || "Walk-in"} •{" "}
            {sale.date_of_purchase ?? "—"}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell min-w-0 py-3",
      cell: (sale) => (
        <div className="flex items-center gap-1.5 font-medium min-w-0 text-foreground/90">
          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="size-3.5" />
          </div>
          <span className="truncate">
            {sale.customer?.full_name || "Walk-in Customer"}
          </span>
        </div>
      ),
    },
    {
      header: "Created By",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell min-w-0 py-3",
      cell: (sale) => (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-foreground/90 truncate">
            {sale.employee?.name || "System"}
          </span>
          <span className="text-[10px] text-muted-foreground/80 font-mono">
            Staff #{sale.employee?.id || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: "Date",
      headerClassName: "hidden md:table-cell w-[115px]",
      className:
        "hidden md:table-cell p-3 text-muted-foreground text-xs whitespace-nowrap",
      cell: (sale) => sale.date_of_purchase ?? "—",
    },
    {
      header: "Payment",
      headerClassName: "hidden 2xl:table-cell w-[130px]",
      className: "hidden 2xl:table-cell whitespace-nowrap py-3",
      cell: (sale) => (
        <Badge
          variant="secondary"
          className="capitalize text-[11px] font-medium bg-secondary/70 hover:bg-secondary/90 transition-colors"
        >
          {sale.payment_method?.replace(/_/g, " ") || "Cash"}
        </Badge>
      ),
    },
    {
      header: "Status",
      headerClassName: "hidden sm:table-cell w-[110px]",
      className: "hidden sm:table-cell whitespace-nowrap py-3",
      cell: () => (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-medium gap-1 px-2 py-0.5"
        >
          <PauseCircle className="size-3 text-blue-600 dark:text-blue-400" />
          Parked
        </Badge>
      ),
    },
    {
      header: "Total",
      headerClassName: "text-right w-[120px] sm:w-[140px]",
      className:
        "p-3 text-right font-mono font-bold text-xs sm:text-sm whitespace-nowrap text-foreground",
      cell: (sale) => currencyFormatter.format(sale.total_amount),
    },
    {
      header: "Actions",
      headerClassName: "w-[260px] text-right pr-4",
      className: "p-3 pr-4 text-right whitespace-nowrap w-[260px] shrink-0",
      cell: (sale) => {
        const isCurrentLoading = actionLoadingId === sale.id;

        return (
          <div className="flex items-center justify-end">
            <div className="hidden sm:flex items-center justify-end gap-2 whitespace-nowrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSale(sale)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              >
                <Eye className="size-3.5 mr-1 text-primary" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVoidTarget(sale)}
                disabled={isCurrentLoading}
                className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border shrink-0"
              >
                <Ban className="size-3.5 mr-1" />
                Void
              </Button>
              <Button
                size="sm"
                onClick={() => handleAuthorize(sale)}
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
                    Parked Options
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <Eye className="size-4 text-primary" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2 text-emerald-600 font-medium"
                    onClick={() => handleAuthorize(sale)}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Authorize Sale</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 py-2 text-destructive font-medium"
                    onClick={() => setVoidTarget(sale)}
                  >
                    <Ban className="size-4" />
                    <span>Void Sale</span>
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <PauseCircle className="size-3.5" />
              {response?.pagination?.total_items ?? 0} on hold
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Parked Transactions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage paused checkouts and resume or void them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs"
          >
            <RotateCw
              className={
                isFetching ? "size-3.5 animate-spin text-primary" : "size-3.5"
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

      {/* Main Table */}
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs [&_table]:table-fixed [&_table]:w-full [&_tbody_tr:hover]:bg-accent/40 [&_tbody_tr]:transition-colors">
        <GenericDataTable
          title="Parked Transactions"
          columns={columns}
          data={sales}
          pagination={{
            current_page: response?.pagination?.current_page ?? 1,
            per_page: response?.pagination?.per_page ?? 10,
            total_pages: response?.pagination?.total_pages ?? 1,
            total_items: response?.pagination?.total_items ?? 0,
          }}
          links={response?.links ?? {}}
          isLoading={isLoading}
          getRowKey={(item) => item.id}
        />
      </div>

      {/* Details Modal */}
      <Dialog
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
      >
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/80 shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white shrink-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md">
                <PauseCircle className="size-3" /> Parked Sale
              </span>
              <span className="font-mono text-xs opacity-90">
                ID #{selectedSale?.id}
              </span>
            </div>
            <DialogTitle className="mt-2.5 font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {selectedSale?.sales_invoice_number}
            </DialogTitle>
            <DialogDescription className="text-white/85 text-xs mt-0.5">
              Initiated on {selectedSale?.date_of_purchase ?? "Today"}
            </DialogDescription>
          </div>

          {selectedSale && (
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/70 p-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </span>
                  <div className="font-mono text-2xl font-extrabold text-foreground tracking-tight">
                    {currencyFormatter.format(selectedSale.total_amount)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-700 text-xs font-semibold"
                >
                  Parked Sale
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <User className="size-3 text-primary" /> Customer
                  </span>
                  <p className="mt-1 font-semibold text-foreground truncate">
                    {selectedSale.customer?.full_name || "Walk-in Customer"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <BadgeCheck className="size-3 text-primary" /> Created By
                  </span>
                  <p className="mt-1 font-semibold text-foreground truncate">
                    {selectedSale.employee?.name || "System"}
                  </p>
                  {selectedSale.employee?.id && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Staff ID #{selectedSale.employee.id}
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-primary" /> Date of Sale
                  </span>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedSale.date_of_purchase ?? "—"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <CreditCard className="size-3 text-primary" /> Payment
                    Method
                  </span>
                  <p className="mt-1 font-semibold text-foreground capitalize">
                    {selectedSale.payment_method?.replace(/_/g, " ") || "Cash"}
                  </p>
                </div>

                {selectedSale.reference_note && (
                  <div className="col-span-2 rounded-lg border border-border/60 p-3 bg-muted/20">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Reference Note
                    </span>
                    <p className="mt-0.5 text-xs text-foreground">
                      {selectedSale.reference_note}
                    </p>
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" /> Items Ordered
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {selectedSale.items?.length ?? 0} item
                    {(selectedSale.items?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 bg-card/40">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    selectedSale.items.map((item) => (
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
                            {item.quantity} ×{" "}
                            {currencyFormatter.format(item.unit_price)}
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-foreground shrink-0">
                          {currencyFormatter.format(
                            item.unit_price * item.quantity,
                          )}
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
              onClick={() => setSelectedSale(null)}
              className="text-xs h-9"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const target = selectedSale;
                setSelectedSale(null);
                if (target) setVoidTarget(target);
              }}
              className="text-xs h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban className="size-3.5 mr-1" />
              Void
            </Button>
            <Button
              onClick={() => {
                const target = selectedSale;
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
        onOpenChange={(open) => !open && setVoidTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Ban className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Void Parked Invoice?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Are you sure you want to void invoice{" "}
              <span className="font-semibold text-foreground font-mono">
                {voidTarget?.sales_invoice_number}
              </span>
              ? All reserved stock units and inventory will be returned to
              available status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setVoidTarget(null)}
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

      {/* Print Modal */}
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
              has been authorized. Would you like to print the official sales
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
