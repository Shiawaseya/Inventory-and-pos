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
import { useBranchInventorySerialized } from "@/features/items/queries/useBranchInventorySerialized";
import InsertStockUnitSheet from "@/features/items/components/InsertStockUnitSheet";
import InsertStockUnitProvider from "@/features/items/store/insertStockUnit";
import { InventoryPagination } from "@/features/items/components/InventoryPagination";
import { SerializedUnitsDialog } from "@/features/items/components/SerializedUnitsDialog";

export default function InventoryItemSerializedTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useBranchInventorySerialized();

  const [selected, setSelected] = useState<Set<number>>(new Set());
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

  const handleShowUnits = (variant: VariantRow) => {
    setSelectedUnitsVariant(variant);
    setUnitsOpen(true);
  };

  const rawItems = data?.data ?? [];
  const groupedData = React.useMemo(
    () => groupBySerializedItems(rawItems),
    [rawItems],
  );

  const currentSort = searchParams.get("sort") || "";

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
      <CardHeader className="px-6 py-6 border-b bg-background/50 backdrop-blur-md">
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
      </CardHeader>

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
                <TableHead>
                  <SortButton title="Pricing" fieldKey="price" />
                </TableHead>
                <TableHead>
                  <SortButton title="Reorder" fieldKey="reorder_level" />
                </TableHead>
                <TableHead>
                  <SortButton title="Stock Level" fieldKey="available_count" />
                </TableHead>
                <TableHead className="text-center">Reserved</TableHead>
                <TableHead>Faulty</TableHead>
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
                        checked ? s.add(id) : s.delete(id);
                        return s;
                      });
                    }}
                    onShowUnits={handleShowUnits}
                  />
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={8}
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
        open={unitsOpen}
        onOpenChange={(open) => {
          setUnitsOpen(open);
          if (!open) setSelectedUnitsVariant(null);
        }}
        variant={selectedUnitsVariant}
      />
    </Card>
  );
}
