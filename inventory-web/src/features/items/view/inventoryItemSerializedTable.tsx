import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "react-router";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Package,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import InventoryItemSerializedColumn from "@/features/items/components/inventoryItemSerializedColumn";
import {
  groupBySerializedItems,
  type VariantRow,
} from "@/features/items/lib/groupBySerializedItem";
import {
  useBranchInventorySerialized,
  resolveRangeParams,
} from "@/features/items/queries/useBranchInventorySerialized";
import InsertStockUnitSheet from "@/features/items/components/InsertStockUnitSheet";
import InsertStockUnitProvider from "@/features/items/store/insertStockUnit";
import { InventoryPagination } from "@/features/items/components/InventoryPagination";
import { SerializedUnitsDialog } from "@/features/items/components/SerializedUnitsDialog";
import { printSkuTags } from "@/lib/printSku";
import DateRangePicker from "@/features/items/components/DateRangePicker";
import { useCatalogFilters } from "@/features/items/queries/useCatalogFilters";

const PER_PAGE_OPTIONS = ["10", "25", "50", "100"];

const KPI_ITEMS = [
  { key: "beginning", label: "Begin", tone: "neutral" },
  { key: "stock_in", label: "In", tone: "in" },
  { key: "void", label: "Void", tone: "in" },
  { key: "lost", label: "Lost", tone: "out" },
  { key: "damage", label: "Damage", tone: "out" },
  { key: "written_off", label: "W/O", tone: "out" },
  { key: "stock_out", label: "Out", tone: "out" },
  { key: "found", label: "Found", tone: "in" },
  { key: "ending", label: "End", tone: "neutral" },
] as const;

const MOVEMENT_HEADS = [
  "Begin",
  "In",
  "Void",
  "Lost",
  "Damage",
  "W/O",
  "Out",
  "Found",
  "End",
];

export default function InventoryItemSerializedTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useBranchInventorySerialized();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(
    new Set(),
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sync search input state with URL parameter `?search=`
  const currentSearchParam = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(currentSearchParam);
  const [, startTransition] = useTransition();

  // Keep local input in sync if URL changes externally (e.g., Back/Forward navigation)
  useEffect(() => {
    setSearchTerm(currentSearchParam);
  }, [currentSearchParam]);

  // Debounced URL updates when typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeSearch = searchParams.get("search") || "";
      const trimmed = searchTerm.trim();

      if (trimmed !== activeSearch) {
        startTransition(() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (trimmed) {
              next.set("search", trimmed);
            } else {
              next.delete("search");
            }
            // Reset to page 1 whenever search query changes
            next.set("page", "1");
            return next;
          });
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, setSearchParams]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("search");
      next.set("page", "1");
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = searchTerm.trim();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        return next;
      });
    }
  };

  // State for the units dialog modal
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [selectedUnitsVariant, setSelectedUnitsVariant] =
    useState<VariantRow | null>(null);
  const [printSerialMode, setPrintSerialMode] = useState(false);

  const handleShowUnits = (variant: VariantRow) => {
    setSelectedUnitsVariant(variant);
    setPrintSerialMode(false);
    setUnitsOpen(true);
  };

  const handlePrintSku = () => {
    printSkuTags(
      selectedVariantRows
        .filter((variant) => variant.sku || variant.variant_id)
        .map((variant) => ({
          sku:
            variant.sku || String(variant.variant_id ?? variant.branch_item_id),
          itemName: variant.item.name,
          model: variant.model,
        })),
    );
  };

  const handlePrintSerial = () => {
    const variant = selectedVariantRows[0];
    if (!variant) return;
    setSelectedUnitsVariant(variant);
    setPrintSerialMode(true);
    setUnitsOpen(true);
  };

  const rawItems = React.useMemo(() => data?.data ?? [], [data?.data]);

  // KPI totals over the items on the current page
  const kpis = React.useMemo(() => {
    const totals: Record<(typeof KPI_ITEMS)[number]["key"], number> = {
      beginning: 0,
      stock_in: 0,
      void: 0,
      lost: 0,
      damage: 0,
      written_off: 0,
      stock_out: 0,
      found: 0,
      ending: 0,
    };
    let reconciled = true;
    for (const row of rawItems) {
      const m = row.movement;
      if (!m) continue;
      for (const { key } of KPI_ITEMS) totals[key] += Number(m[key] ?? 0);
      if (!m.is_reconciled) reconciled = false;
    }
    return { totals, reconciled };
  }, [rawItems]);
  const groupedData = React.useMemo(
    () => groupBySerializedItems(rawItems),
    [rawItems],
  );
  const selectedVariantRows = React.useMemo(
    () =>
      groupedData.flatMap((group) =>
        group.variants.filter((variant) =>
          selectedVariants.has(variant.branch_item_id),
        ),
      ),
    [groupedData, selectedVariants],
  );

  const currentSort = searchParams.get("sort") || "";

  // Stock movement range, kept in the URL: ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD
  // With nothing in the URL it defaults to today, so the movement columns are always shown.
  const effectiveRange = resolveRangeParams(searchParams);

  const handleDateRange = (value: { from: string; to: string } | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("date");
      if (value) {
        next.set("range", "custom");
        next.set("from", value.from);
        next.set("to", value.to);
      } else {
        next.delete("range");
        next.delete("from");
        next.delete("to");
      }
      next.set("page", "1");
      return next;
    });
  };

  // Brand / category filters (the API already supports brand_id and category_id)
  const { brands, categories } = useCatalogFilters();
  const brandId = searchParams.get("brand_id") || "";
  const categoryId = searchParams.get("category_id") || "";

  const handleFilterChange = (
    key: "brand_id" | "category_id",
    value: string,
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.set("page", "1");
      return next;
    });
  };

  const perPage = searchParams.get("per_page") || "10";
  const handlePerPageChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("per_page", value);
      next.set("page", "1");
      return next;
    });
  };

  const hasActiveFilters = !!(
    brandId ||
    categoryId ||
    !effectiveRange.isDefault
  );
  const handleResetFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["brand_id", "category_id", "range", "date", "from", "to"].forEach((k) =>
        next.delete(k),
      );
      next.set("page", "1");
      return next;
    });
  };

  const handleSort = (fieldKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const activeSort = next.get("sort");

      if (activeSort === fieldKey) {
        next.set("sort", `-${fieldKey}`);
      } else if (activeSort === `-${fieldKey}`) {
        next.delete("sort");
      } else {
        next.set("sort", fieldKey);
      }

      next.set("page", "1");
      return next;
    });
  };

  const SortButton = ({
    title,
    fieldKey,
  }: {
    title: string;
    fieldKey: string;
  }) => {
    const isAsc = currentSort === fieldKey;
    const isDesc = currentSort === `-${fieldKey}`;
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
    <Card className="h-full w-full flex flex-col border-none shadow-none bg-transparent overflow-hidden">
      <CardHeader className="relative z-40 border-b bg-background/50 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">
                Inventory Catalog
              </CardTitle>
              <CardDescription className="text-xs">
                Manage serialized stock across branches.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <div className="flex items-center gap-2 pr-2 border-r animate-in fade-in slide-in-from-right-2">
                <span className="text-xs font-bold px-2 py-1 bg-primary text-primary-foreground rounded">
                  {selected.size}
                </span>
                <Button
                  size="sm"
                  onClick={() => setSheetOpen(true)}
                  className="h-8"
                >
                  Restock Selected
                </Button>
              </div>
            )}
            {selectedVariantRows.length > 0 && (
              <div className="flex items-center gap-2 pr-2 border-r">
                <Button size="sm" variant="outline" onClick={handlePrintSku}>
                  Print SKU Tag
                </Button>
                <Button size="sm" onClick={handlePrintSerial}>
                  Print Serial Tag
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar Bound to URL Query Params */}
        <div className="mt-4 flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search serials, items, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters: date range, category, brand */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={
              effectiveRange.range === "custom"
                ? { from: effectiveRange.from, to: effectiveRange.to }
                : null
            }
            label={effectiveRange.isDefault ? "Today" : undefined}
            clearable={!effectiveRange.isDefault}
            onChange={handleDateRange}
            placeholder="Select dates"
          />

          <select
            value={categoryId}
            onChange={(e) => handleFilterChange("category_id", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={brandId}
            onChange={(e) => handleFilterChange("brand_id", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            aria-label="Filter by brand"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.brand_id} value={b.brand_id}>
                {b.name}
              </option>
            ))}
          </select>

          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Rows per page
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              aria-label="Rows per page"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={handleResetFilters}
            >
              <X className="mr-1 size-3.5" />
              Reset filters
            </Button>
          )}
        </div>
      </CardHeader>

      {!isError && (
        <div className="border-b bg-background/50 px-6 py-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {KPI_ITEMS.map((k) => (
              <div
                key={k.key}
                className="rounded-lg border bg-background px-3 py-2"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </p>
                <p
                  className={
                    "mt-0.5 text-xl font-bold tabular-nums " +
                    (k.tone === "in"
                      ? "text-emerald-600"
                      : k.tone === "out"
                        ? "text-red-600"
                        : "text-foreground")
                  }
                >
                  {isLoading ? "—" : kpis.totals[k.key]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Totals for the {rawItems.length} variant
            {rawItems.length === 1 ? "" : "s"} on this page
            {!kpis.reconciled &&
              " · some rows do not reconcile (check the warning icons)"}
          </p>
        </div>
      )}

      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Spinner />
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              Synchronizing...
            </p>
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="font-semibold text-sm">Connection Failed</p>
            <p className="text-xs text-muted-foreground">
              Check your API status and try again.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background/90 backdrop-blur-md z-30 border-b">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[80px] px-4">Toggle</TableHead>
                <TableHead className="min-w-[200px]">
                  <SortButton title="Product" fieldKey="name" />
                </TableHead>
                {MOVEMENT_HEADS.map((h) => (
                  <TableHead key={h} className="px-3 text-center text-xs">
                    {h}
                  </TableHead>
                ))}
                <TableHead className="text-right">
                  <SortButton title="Last Sync" fieldKey="updated_at" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length > 0 ? (
                groupedData.map((g) => (
                  <InventoryItemSerializedColumn
                    key={g.item_id}
                    data={g}
                    selected={selected.has(g.item_id)}
                    onToggle={(id, checked) => {
                      setSelected((prev) => {
                        const s = new Set(prev);
                        if (checked) s.add(id);
                        else s.delete(id);
                        return s;
                      });
                      const group = groupedData.find(
                        (item) => item.item_id === id,
                      );
                      setSelectedVariants((prev) => {
                        const next = new Set(prev);
                        group?.variants.forEach((variant) => {
                          if (checked) next.add(variant.branch_item_id);
                          else next.delete(variant.branch_item_id);
                        });
                        return next;
                      });
                    }}
                    selectedVariants={selectedVariants}
                    onToggleVariant={(variant, checked) => {
                      setSelectedVariants((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(variant.branch_item_id);
                        else next.delete(variant.branch_item_id);
                        return next;
                      });
                      const group = groupedData.find(
                        (item) => item.item_id === variant.item_id,
                      );
                      const allSelected = group?.variants.every((item) =>
                        item.branch_item_id === variant.branch_item_id
                          ? checked
                          : selectedVariants.has(item.branch_item_id),
                      );
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (allSelected) next.add(variant.item_id);
                        else next.delete(variant.item_id);
                        return next;
                      });
                    }}
                    onShowUnits={handleShowUnits}
                  />
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={12}
                    className="h-32 text-center text-muted-foreground text-sm italic"
                  >
                    No inventory items found.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InventoryPagination pagination={data?.pagination} />

      <InsertStockUnitProvider>
        <InsertStockUnitSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          items={rawItems.filter((d) => selected.has(d.item_id))}
        />
      </InsertStockUnitProvider>

      {/* Stock Units Modal Dialog */}
      <SerializedUnitsDialog
        key={`${selectedUnitsVariant?.branch_item_id ?? "none"}-${printSerialMode}`}
        open={unitsOpen}
        onOpenChange={(open) => {
          setUnitsOpen(open);
          if (!open) {
            setSelectedUnitsVariant(null);
            setPrintSerialMode(false);
          }
        }}
        variant={selectedUnitsVariant}
        printMode={printSerialMode}
      />
    </Card>
  );
}
