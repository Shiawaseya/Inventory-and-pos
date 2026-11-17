import { Clock, ReceiptText, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  recentReceiptsApi,
  type RecentReceipt,
  type RecentReceiptsSearchParams,
} from "@/features/pos/api/recentReceiptsApi";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function RecentReceiptsPage() {
  const branchId = Number(loginApi.getUser()?.branchId ?? 0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] =
    useState<NonNullable<RecentReceiptsSearchParams["sort"]>>("date_desc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RecentReceipt | null>(
    null,
  );

  const dSearch = useDebounced(search);

  // Reset pagination on filter adjustments
  useEffect(() => {
    setPage(1);
  }, [dSearch, status, sort]);

  const receiptsQuery = useQuery({
    queryKey: ["recent-receipts", branchId, dSearch, status, sort, page],
    queryFn: () =>
      recentReceiptsApi.list({
        branchId,
        search: dSearch,
        status: status || undefined,
        sort,
        page,
        perPage: 12,
      }),
    enabled: branchId > 0,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const receipts = receiptsQuery.data?.data ?? [];
  const pagination = receiptsQuery.data?.pagination;
  const activeCount = (status ? 1 : 0) + (dSearch ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    setStatus("");
    setSort("date_desc");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Top Header & Integrated Filter Bar */}
      <div className="shrink-0 space-y-2 rounded-xl border border-border bg-card p-2.5 sm:p-3 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Recent Receipts
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {receiptsQuery.isFetching
                ? "Updating…"
                : `${pagination?.total_items ?? 0} found`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or customer..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 sm:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal size={13} />
              {activeCount ? `(${activeCount})` : ""}
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          className={`flex-wrap items-center gap-2 pt-1 border-t border-border/50 ${
            filtersOpen ? "flex" : "hidden sm:flex"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Status:
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="parked">Parked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Sort:
            </span>
            <select
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as NonNullable<
                    RecentReceiptsSearchParams["sort"]
                  >,
                )
              }
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="date_desc">Latest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="total_amount_desc">Highest total</option>
              <option value="total_amount_asc">Lowest total</option>
            </select>
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={13} className="mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Receipt Cards Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {!branchId ? (
          <Empty text="No branch is assigned to this account." />
        ) : receiptsQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : receiptsQuery.isError ? (
          <Empty
            text={
              (receiptsQuery.error as Error).message ||
              "Unable to load receipts."
            }
            error
          />
        ) : receipts.length === 0 ? (
          <Empty text="No receipts found matching your criteria." />
        ) : (
          <div
            className={`grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
              receiptsQuery.isFetching ? "opacity-60" : ""
            }`}
          >
            {receipts.map((invoice) => (
              <ReceiptCard
                key={invoice.id}
                invoice={invoice}
                onClick={() => setSelectedReceipt(invoice)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.total_pages > 1 && (
        <div className="shrink-0 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 shadow-xs">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ReceiptDetailDialog
        invoice={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}

function ReceiptCard({
  invoice,
  onClick,
}: {
  invoice: RecentReceipt;
  onClick: () => void;
}) {
  const isParked = invoice.status === "parked";
  const dateFormatted = invoice.created_at
    ? new Date(invoice.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      onClick={onClick}
      className="group flex flex-col justify-between cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/50 text-primary">
            <ReceiptText size={15} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold text-foreground group-hover:text-primary">
              {invoice.sales_invoice_number}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {invoice.customer?.full_name ||
                invoice.customer?.name ||
                "Walk-in customer"}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            isParked
              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
          }`}
        >
          {invoice.status}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-border/40 pt-2">
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={11} /> {dateFormatted} · {invoice.items?.length || 0}{" "}
            items
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">
            By:{" "}
            {invoice.employee?.name || invoice.employee?.full_name || "Staff"}
          </span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {peso(invoice.total_amount)}
        </span>
      </div>
    </div>
  );
}

function ReceiptDetailDialog({
  invoice,
  onClose,
}: {
  invoice: RecentReceipt | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Receipt #{invoice?.sales_invoice_number}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Created on{" "}
            {invoice?.created_at
              ? new Date(invoice.created_at).toLocaleString()
              : "—"}
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Customer
                </p>
                <p className="mt-0.5 font-medium text-foreground truncate">
                  {invoice.customer?.full_name ||
                    invoice.customer?.name ||
                    "Walk-in Customer"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Payment Method
                </p>
                <p className="mt-0.5 font-medium uppercase text-foreground">
                  {invoice.payment_method.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Prepared By
                </p>
                <p className="mt-0.5 font-medium text-foreground truncate">
                  {invoice.employee?.name || invoice.employee?.full_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  OIC Authorizer
                </p>
                <p className="mt-0.5 font-medium text-foreground truncate">
                  {invoice.authorized_by?.name ||
                    invoice.authorized_by?.full_name ||
                    "None / Direct"}
                </p>
              </div>
            </div>

            <div className="max-h-52 space-y-1.5 overflow-y-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Purchased Items ({invoice.items?.length || 0})
              </p>
              <div className="divide-y divide-border/50 rounded-lg border border-border bg-background">
                {invoice.items?.map((item) => (
                  <div
                    key={item.detail_id}
                    className="flex items-center justify-between p-2.5"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium text-foreground">
                        {item.item_name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.model}
                        {item.serial_number
                          ? ` · S/N: ${item.serial_number}`
                          : ""}
                        {` · Qty: ${item.quantity}`}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-medium text-foreground shrink-0">
                      {peso(item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Total Amount
              </span>
              <span className="text-lg font-bold text-primary">
                {peso(invoice.total_amount)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text, error }: { text: string; error?: boolean }) {
  return (
    <div
      className={`grid h-full place-items-center p-8 text-center text-xs ${
        error ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}
