import {
  PackageSearch,
  ScanBarcode,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GroupedInventoryItem } from "../types/pos.types";
import { ProductImage } from "./ProductImage";

type ProductGridProps = {
  search: string;
  searchMode: "sku" | "serial";
  showOutOfStock: boolean;
  onSearchChange: (value: string) => void;
  onSearchModeChange: (mode: "sku" | "serial") => void;
  onShowOutOfStockChange: (show: boolean) => void;
  products: GroupedInventoryItem[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (product: GroupedInventoryItem) => void;
  onBarcodeSearch: (sku: string) => void;
};

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const GRID =
  "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

export function ProductGrid({
  search,
  searchMode,
  showOutOfStock,
  onSearchChange,
  onSearchModeChange,
  onShowOutOfStockChange,
  products,
  isLoading,
  isError,
  onSelect,
  onBarcodeSearch,
}: ProductGridProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [searchMode]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "F3") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key !== "F2") return;
      event.preventDefault();
      onSearchModeChange(searchMode === "serial" ? "sku" : "serial");
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onSearchModeChange, searchMode]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4">
      {/* Search / barcode */}
      <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 transition-shadow focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
        {searchMode === "serial" ? (
          <ScanBarcode size={17} className="shrink-0 text-muted-foreground" />
        ) : (
          <Search size={17} className="shrink-0 text-muted-foreground" />
        )}
        <Input
          ref={searchInputRef}
          autoFocus
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onBarcodeSearch(search);
          }}
          placeholder={
            searchMode === "serial"
              ? "Scan or enter a serial number"
              : "Search model or enter a SKU"
          }
          className="h-11 border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
        />
        <div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => onSearchModeChange("sku")}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
              searchMode === "sku"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            SKU
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange("serial")}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
              searchMode === "serial"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Serial
          </button>
        </div>
        <span className="hidden text-[10px] text-muted-foreground lg:inline">
          F2: mode · F3: focus
        </span>
      </div>
      <label className="flex shrink-0 items-center gap-2 px-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showOutOfStock}
          onChange={(event) => onShowOutOfStockChange(event.target.checked)}
          className="size-3.5 accent-primary"
        />
        Show out of stock
      </label>

      {/* Grid */}
      <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border/60 bg-background"
              >
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div className="flex max-w-xs flex-col items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert size={20} />
              </span>
              <p className="text-sm font-semibold text-foreground">
                Couldn't load inventory
              </p>
              <p className="text-xs text-muted-foreground">
                Check your connection, then refresh the page.
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div className="flex max-w-xs flex-col items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                <PackageSearch size={20} />
              </span>
              <p className="text-sm font-semibold text-foreground">
                {search ? `Nothing matches “${search}”` : "No products yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {search
                  ? "Try an item name, model, or SKU."
                  : "Products added to this branch will show up here."}
              </p>
            </div>
          </div>
        ) : (
          <div className={GRID}>
            {products.map((product) => {
              const prices = product.variants.map((v) => Number(v.price ?? 0));
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;
              const stock = product.variants.reduce(
                (sum, v) => sum + (v.available_count ?? 0),
                0,
              );
              const image =
                (product.item as { image_url?: string | null }).image_url ??
                (product.variants[0] as { image_url?: string | null })
                  ?.image_url;
              const out = stock === 0;
              const low = !out && stock <= 5;

              return (
                <button
                  type="button"
                  key={product.item_id}
                  onClick={() => onSelect(product)}
                  disabled={out}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
                >
                  <div className="relative aspect-[4/3] w-full shrink-0">
                    <ProductImage
                      src={image}
                      alt={product.item.name}
                      className={cn("size-full", out && "grayscale")}
                      iconSize={22}
                    />
                    <span
                      className={cn(
                        "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur",
                        out && "bg-destructive/90 text-white",
                        low && "bg-amber-500/90 text-white",
                        !out && !low && "bg-background/85 text-foreground",
                      )}
                    >
                      {!out && !low && (
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                      )}
                      {out
                        ? "Out of stock"
                        : low
                          ? `Only ${stock} left`
                          : `${stock} in stock`}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                      {product.item.name}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <span className="truncate text-sm font-bold tabular-nums tracking-tight text-foreground">
                        {min === max ? peso(min) : `${peso(min)}–${peso(max)}`}
                      </span>
                      {product.variants.length > 1 && (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {product.variants.length} options
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
