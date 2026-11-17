import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Search,
  Barcode,
  PackageCheck,
  X,
} from "lucide-react";
import { AdjustmentForm } from "../components/AdjustmentForm";
import type {
  StockAdjustmentRecord,
  StockAdjustmentItemRecord,
  StockAdjustmentReason,
  PaginationMeta,
} from "../types";
import { stockAdjustmentApi } from "../api/stockAdjustmentApi";

// Badge styler for Adjustment Reasons
function getReasonBadgeVariant(reason: StockAdjustmentReason): string {
  switch (reason) {
    case "found_stock":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400";
    case "damaged":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400";
    case "internal_use":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400";
    case "lost_theft":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400";
    case "expired":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function StockAdjustmentView() {
  const currentBranchId = 1; // Pull from your global Auth/Branch context

  // Data & Loading State
  const [history, setHistory] = useState<StockAdjustmentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: 10,
  });

  // Row Expansion & Lazy Load Item State
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());
  const [loadedItems, setLoadedItems] = useState<
    Record<number, StockAdjustmentItemRecord[]>
  >({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});

  const loadHistory = useCallback(
    async (targetPage = page) => {
      setLoadingHistory(true);
      setErrorMessage(null);
      try {
        const filters: Record<string, any> = {};
        if (selectedReason !== "all") filters.reason = selectedReason;
        if (searchQuery.trim()) filters.search = searchQuery.trim();

        const res = await stockAdjustmentApi.getByBranch(
          currentBranchId,
          targetPage,
          10,
          filters,
        );

        if (res.success) {
          setHistory(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        } else {
          setErrorMessage(res.message || "Failed to load adjustment history.");
        }
      } catch {
        setErrorMessage("A network error occurred while fetching adjustments.");
      } finally {
        setLoadingHistory(false);
      }
    },
    [currentBranchId, page, selectedReason, searchQuery],
  );

  useEffect(() => {
    loadHistory(page);
  }, [page, selectedReason, loadHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedReason("all");
    setPage(1);
  };

  const toggleRow = async (record: StockAdjustmentRecord) => {
    const next = new Set(expandedRowIds);
    const isExpanding = !next.has(record.id);

    if (isExpanding) {
      next.add(record.id);

      // Lazy load unit items if not present in the record
      if (!record.items && !loadedItems[record.id]) {
        setLoadingItems((prev) => ({ ...prev, [record.id]: true }));
        try {
          const detailRes = await stockAdjustmentApi.getById(record.id);
          if (detailRes.success && detailRes.data?.items) {
            setLoadedItems((prev) => ({
              ...prev,
              [record.id]: detailRes.data.items || [],
            }));
          }
        } catch {
          setLoadedItems((prev) => ({ ...prev, [record.id]: [] }));
        } finally {
          setLoadingItems((prev) => ({ ...prev, [record.id]: false }));
        }
      }
    } else {
      next.delete(record.id);
    }

    setExpandedRowIds(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Adjustment</h1>
        <p className="mt-1 text-muted-foreground">
          Adjust individual stock units and log discrepancy reasons.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Adjustment Creation Form Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Adjustment</CardTitle>
            <CardDescription>
              Select unit serial numbers and change their status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdjustmentForm
              branchId={currentBranchId}
              onSuccess={() => {
                setPage(1);
                loadHistory(1);
              }}
            />
          </CardContent>
        </Card>

        {/* History / Audit Card */}
        <Card className="w-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle>Recent Adjustments</CardTitle>
              <CardDescription>Latest branch stock changes</CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHistory(page)}
              disabled={loadingHistory}
              className="self-start sm:self-auto gap-2"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference or note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              <div className="w-full sm:w-[200px]">
                <Select
                  value={selectedReason}
                  onValueChange={(val) => {
                    setSelectedReason(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm capitalize">
                    <SelectValue placeholder="Filter by reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="lost_theft">Lost / Theft</SelectItem>
                    <SelectItem value="inventory_audit">
                      Inventory Audit
                    </SelectItem>
                    <SelectItem value="internal_use">Internal Use</SelectItem>
                    <SelectItem value="found_stock">Found Stock</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || selectedReason !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Adjustments Table */}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Reference & Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-10"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading adjustments...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8 text-sm"
                      >
                        No adjustments match the current criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((record) => {
                      const isExpanded = expandedRowIds.has(record.id);
                      const items =
                        record.items || loadedItems[record.id] || [];
                      const isFetchingItems = loadingItems[record.id];
                      const badgeClass = getReasonBadgeVariant(record.reason);

                      return (
                        <Fragment key={record.id}>
                          <TableRow
                            onClick={() => toggleRow(record)}
                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                              isExpanded ? "bg-muted/30 border-b-0" : ""
                            }`}
                          >
                            <TableCell className="pr-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 text-muted-foreground"
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${
                                    isExpanded ? "rotate-0" : "-rotate-90"
                                  }`}
                                />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-xs font-semibold">
                                {record.adjustment_number}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {record.adjusted_by?.name || "System"} •{" "}
                                {new Date(record.created_at).toLocaleString(
                                  [],
                                  {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  },
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`capitalize text-[11px] ${badgeClass}`}
                              >
                                {record.reason.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {record.notes || (
                                <span className="opacity-40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-medium">
                              {record.total_items}
                            </TableCell>
                          </TableRow>

                          {/* Expanded Unit Serial Details Sub-Row */}
                          {isExpanded && (
                            <TableRow className="bg-muted/20 hover:bg-muted/20 border-t-0">
                              <TableCell colSpan={5} className="p-0">
                                <div className="px-6 py-4 border-t border-dashed bg-muted/10 space-y-3">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                    <Barcode className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      Adjusted Serial Numbers (
                                      {record.total_items})
                                    </span>
                                  </div>

                                  {isFetchingItems ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Loading item serials...
                                    </div>
                                  ) : items.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                      No unit details found for this adjustment.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {items.map((item) => (
                                        <div
                                          key={item.id || item.serial_number}
                                          className="flex items-center justify-between p-2.5 rounded border bg-background text-xs shadow-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <PackageCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                            <div>
                                              <div className="font-mono font-medium">
                                                {item.serial_number}
                                              </div>
                                              {item.product_name && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  {item.product_name}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {item.new_status && (
                                            <Badge
                                              variant="secondary"
                                              className="text-[10px] px-1.5 py-0 capitalize"
                                            >
                                              {item.new_status.replace(
                                                /_/g,
                                                " ",
                                              )}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
            </div>

            {/* Server Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <div>
                  Page {pagination.current_page} of {pagination.total_pages} (
                  {pagination.total_items} total)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loadingHistory}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(pagination.total_pages, p + 1))
                    }
                    disabled={page >= pagination.total_pages || loadingHistory}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
