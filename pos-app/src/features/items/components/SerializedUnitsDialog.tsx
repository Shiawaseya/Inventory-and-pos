import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Boxes,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { VariantRow } from "../lib/groupBySerializedItem";
import { useStockUnitsByVariant } from "../queries/useStockUnitsQuery";
import type { StockUnitStatus } from "../api/stockUnitApi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: VariantRow | null;
};

const STATUS_FILTERS = [
  "all",
  "available",
  "reserved",
  "damaged",
  "sold",
] as const;

function getStatusBadge(status: StockUnitStatus) {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700">Available</Badge>
      );
    case "reserved":
      return <Badge variant="secondary">Reserved</Badge>;
    case "damaged":
      return <Badge variant="destructive">Damaged</Badge>;
    case "sold":
      return (
        <Badge
          variant="outline"
          className="text-muted-foreground border-dashed"
        >
          Sold
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SerializedUnitsDialog({ open, onOpenChange, variant }: Props) {
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("");

  const variantId = variant?.variant_id || variant?.branch_item_id || 0;

  const { data, isLoading, isError, error } = useStockUnitsByVariant(
    variantId,
    {
      page,
      per_page: perPage,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
      sort: sort || undefined,
    },
    open && variantId > 0,
  );

  const units = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSort = (fieldKey: string) => {
    setSort((prev) => {
      if (prev === fieldKey) return `-${fieldKey}`;
      if (prev === `-${fieldKey}`) return "";
      return fieldKey;
    });
    setPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleClose = () => {
    setPage(1);
    setSearch("");
    setStatusFilter("all");
    setSort("");
    onOpenChange(false);
  };

  const SortButton = ({
    title,
    fieldKey,
  }: {
    title: string;
    fieldKey: string;
  }) => {
    const isAsc = sort === fieldKey;
    const isDesc = sort === `-${fieldKey}`;

    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 hover:bg-transparent font-semibold"
        onClick={() => handleSort(fieldKey)}
      >
        <span>{title}</span>
        {isAsc ? (
          <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
        ) : isDesc ? (
          <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
        )}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Boxes className="size-5 text-primary" />
            <DialogTitle>Serialized Stock Units</DialogTitle>
          </div>
          <DialogDescription>
            {variant?.item?.name} —{" "}
            <span className="font-semibold text-foreground">
              {variant?.model}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 py-2 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search serial number..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {STATUS_FILTERS.map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`
                    px-2.5 py-1 text-xs rounded-full font-medium capitalize transition-colors
                    ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto border rounded-md min-h-[320px]">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Spinner />
              <span className="text-xs text-muted-foreground">
                Loading stock units...
              </span>
            </div>
          ) : isError ? (
            <div className="h-64 flex items-center justify-center p-4 text-destructive text-sm">
              {error instanceof Error
                ? error.message
                : "Failed to load stock units"}
            </div>
          ) : units.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <Boxes className="size-8 stroke-1 mb-2 opacity-40" />
              <span>No stock units found for this filter.</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  <TableHead className="w-[110px]">
                    <SortButton title="Unit ID" fieldKey="stock_unit_id" />
                  </TableHead>
                  <TableHead>
                    <SortButton
                      title="Serial Number"
                      fieldKey="serial_number"
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton title="Status" fieldKey="status" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow
                    key={unit.stock_unit_id}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{unit.stock_unit_id}
                    </TableCell>
                    <TableCell className="font-mono font-medium text-sm">
                      {unit.serial_number}
                    </TableCell>
                    <TableCell>{getStatusBadge(unit.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(
                  pagination.current_page * pagination.per_page,
                  pagination.total_items,
                )}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {pagination.total_items}
              </span>{" "}
              units
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={pagination.current_page <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 font-medium">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setPage((p) => Math.min(pagination.total_pages, p + 1))
                }
                disabled={pagination.current_page >= pagination.total_pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(pagination.total_pages)}
                disabled={pagination.current_page >= pagination.total_pages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SerializedUnitsDialog;
