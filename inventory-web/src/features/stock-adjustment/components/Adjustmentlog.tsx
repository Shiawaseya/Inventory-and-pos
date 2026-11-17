import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stockAdjustmentApi } from "../api/stockAdjustmentApi";
import type {
  PaginationMeta,
  StockAdjustmentItemRecord,
  StockAdjustmentRecord,
} from "../types";

const PER_PAGE = 10;

/** Dot colour carries the meaning: stock coming back, stock leaving, or neutral. */
const REASONS: Record<string, { label: string; dot: string }> = {
  found_stock: { label: "Found stock", dot: "bg-emerald-500" },
  damaged: { label: "Damaged", dot: "bg-rose-500" },
  lost_theft: { label: "Lost or stolen", dot: "bg-amber-500" },
  expired: { label: "Expired", dot: "bg-purple-500" },
  internal_use: { label: "Internal use", dot: "bg-blue-500" },
  inventory_audit: { label: "Inventory audit", dot: "bg-slate-400" },
  inspection: { label: "Inspection", dot: "bg-orange-500" },
  other: { label: "Other", dot: "bg-muted-foreground/60" },
};

const reasonMeta = (reason: string) =>
  REASONS[reason] ?? { label: humanize(reason), dot: "bg-muted-foreground/60" };

function humanize(value: string): string {
  const text = value.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type ItemsState = {
  status: "loading" | "ready" | "error";
  items: StockAdjustmentItemRecord[];
  message?: string;
};

export function AdjustmentLog() {
  const [rows, setRows] = useState<StockAdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: PER_PAGE,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("all");
  const term = useDebounced(search.trim());

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [details, setDetails] = useState<Record<number, ItemsState>>({});

  // Ignore responses from requests that have been superseded.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, any> = {};
      if (reason !== "all") filters.reason = reason;
      if (term) filters.adjustment_number = term;

      const res = await stockAdjustmentApi.getByBranch(
        undefined,
        page,
        PER_PAGE,
        filters,
      );
      if (requestId !== latestRequest.current) return;

      if (res.success) {
        setRows(res.data);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.message || "Couldn't load the adjustment log.");
      }
    } catch {
      if (requestId === latestRequest.current) {
        setError("Network error while loading adjustments.");
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [page, reason, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadItems = async (record: StockAdjustmentRecord) => {
    if (record.items?.length) return;
    const current = details[record.id]?.status;
    if (current === "loading" || current === "ready") return;

    setDetails((prev) => ({
      ...prev,
      [record.id]: { status: "loading", items: [] },
    }));
    try {
      const res = await stockAdjustmentApi.getById(record.id);
      setDetails((prev) => ({
        ...prev,
        [record.id]: res.success
          ? { status: "ready", items: res.data?.items ?? [] }
          : {
              status: "error",
              items: [],
              message: res.message || "Couldn't load the serial numbers.",
            },
      }));
    } catch {
      setDetails((prev) => ({
        ...prev,
        [record.id]: {
          status: "error",
          items: [],
          message: "Network error while loading serial numbers.",
        },
      }));
    }
  };

  const toggle = (record: StockAdjustmentRecord) => {
    const opening = !expanded.has(record.id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(record.id);
      else next.delete(record.id);
      return next;
    });
    if (opening) void loadItems(record);
  };

  const hasFilters = Boolean(search.trim()) || reason !== "all";
  const resetFilters = () => {
    setSearch("");
    setReason("all");
    setPage(1);
  };

  const { current_page, total_pages, total_items, per_page } = pagination;
  const from = total_items === 0 ? 0 : (current_page - 1) * per_page + 1;
  const to = Math.min(total_items, current_page * per_page);
  const firstLoad = loading && rows.length === 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by adjustment number"
            aria-label="Search by adjustment number"
            className="h-9 bg-background pl-9 pr-9 font-mono text-sm placeholder:font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Select
          value={reason}
          onValueChange={(value) => {
            setReason(value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9 w-full text-sm sm:w-48"
            aria-label="Filter by reason"
          >
            <SelectValue placeholder="All reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {Object.entries(REASONS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-sm"
            >
              Reset
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh log"
            className="size-9"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-3 text-xs">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              className="h-7 text-xs"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-2">
                <span className="sr-only">Expand</span>
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Adjustment
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Reason
              </TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">
                Notes
              </TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground md:table-cell">
                Adjusted by
              </TableHead>
              <TableHead className="pr-5 text-right text-xs font-medium text-muted-foreground">
                Units
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className={loading && !firstLoad ? "opacity-60" : ""}>
            {firstLoad ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-14 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading adjustments
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-14 text-center">
                  <div className="mx-auto flex max-w-64 flex-col items-center gap-1.5">
                    <ClipboardList className="size-7 stroke-1 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">
                      {hasFilters
                        ? "No adjustments match"
                        : "No adjustments yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasFilters
                        ? "Clear the search or pick a different reason."
                        : "Adjustments made for this branch will show up here."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((record) => {
                const isOpen = expanded.has(record.id);
                const meta = reasonMeta(record.reason);
                const state = details[record.id];
                const items = record.items?.length
                  ? record.items
                  : (state?.items ?? []);

                return (
                  <Fragment key={record.id}>
                    <TableRow
                      onClick={() => toggle(record)}
                      className={`cursor-pointer ${isOpen ? "bg-muted/30" : ""}`}
                    >
                      <TableCell className="px-2">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Hide" : "Show"} serial numbers for ${record.adjustment_number}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggle(record);
                          }}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <ChevronDown
                            className={`size-4 transition-transform ${
                              isOpen ? "" : "-rotate-90"
                            }`}
                          />
                        </button>
                      </TableCell>

                      <TableCell>
                        <p className="font-mono text-[13px] font-semibold text-foreground">
                          {record.adjustment_number}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatWhen(record.created_at)}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1.5 bg-background font-normal"
                        >
                          <span
                            aria-hidden
                            className={`size-1.5 rounded-full ${meta.dot}`}
                          />
                          {meta.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground lg:table-cell">
                        {record.notes || (
                          <span className="text-muted-foreground/50">
                            No notes
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="hidden text-sm text-foreground md:table-cell">
                        {record.adjusted_by?.name || "System"}
                      </TableCell>

                      <TableCell className="pr-5 text-right text-sm font-medium tabular-nums text-foreground">
                        {record.total_items}
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6} className="p-0">
                          <div className="space-y-4 border-t border-dashed px-5 py-4 sm:pl-[3.25rem]">
                            {record.notes && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Notes
                                </p>
                                <p className="whitespace-pre-wrap text-sm text-foreground">
                                  {record.notes}
                                </p>
                              </div>
                            )}

                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                {record.total_items}{" "}
                                {record.total_items === 1
                                  ? "unit adjusted"
                                  : "units adjusted"}
                              </p>

                              {state?.status === "loading" ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Loading serial numbers
                                </div>
                              ) : state?.status === "error" ? (
                                <p className="text-xs text-destructive">
                                  {state.message}
                                </p>
                              ) : items.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No serial numbers were recorded for this
                                  adjustment.
                                </p>
                              ) : (
                                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                  {items.map((item) => (
                                    <li
                                      key={item.id || item.serial_number}
                                      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate font-mono text-[13px] font-medium text-foreground">
                                          {item.serial_number}
                                        </p>
                                        {item.product_name && (
                                          <p className="truncate text-xs text-muted-foreground">
                                            {item.product_name}
                                          </p>
                                        )}
                                      </div>
                                      {item.new_status && (
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 font-normal"
                                        >
                                          {humanize(item.new_status)}
                                        </Badge>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-2">
          <p className="pl-1 text-xs text-muted-foreground">
            {total_items === 0
              ? "No records"
              : `Showing ${from} to ${to} of ${total_items}`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || loading}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="px-1 text-xs tabular-nums text-muted-foreground">
              {current_page} / {total_pages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setPage((value) => Math.min(total_pages, value + 1))
              }
              disabled={page >= total_pages || loading}
              className="h-8 gap-1 text-xs"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
