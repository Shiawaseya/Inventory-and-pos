import { Check, Hash, Layers, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useStockUnitsByVariant } from "@/features/items/queries/useStockUnitsQuery";
import type { StockUnitRecord } from "@/features/items/api/stockUnitApi";
import type { ProductSelection, VariantRow } from "../types/pos.types";
import { ProductImage } from "./ProductImage";

const peso = (n: number) =>
  `₱${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type WithImage = { image_url?: string | null };
const variantImage = (variant: VariantRow) =>
  (variant as WithImage).image_url ?? (variant.item as WithImage)?.image_url;

type VariantDialogProps = {
  item: ProductSelection;
  onClose: () => void;
  onSelect: (variant: VariantRow) => void;
};

export function VariantDialog({ item, onClose, onSelect }: VariantDialogProps) {
  const count = item?.variants.length ?? 0;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-5 py-4 text-left">
          <div className="flex items-center gap-3.5">
            <ProductImage
              src={(item?.item as WithImage | undefined)?.image_url}
              alt={item?.item.name ?? ""}
              className="size-14 shrink-0 rounded-xl border border-border/60"
              iconSize={20}
            />
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold tracking-tight text-foreground">
                {item?.item.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose one of {count} {count === 1 ? "option" : "options"} to
                add to the sale.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item?.variants.map((variant) => {
              const out = !variant.available_count;
              const low =
                !out &&
                variant.reorder_level != null &&
                variant.available_count <= variant.reorder_level;

              return (
                <button
                  type="button"
                  key={variant.branch_item_id}
                  disabled={out}
                  onClick={() => onSelect(variant)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <div className="relative aspect-square w-full shrink-0">
                    <ProductImage
                      src={variantImage(variant)}
                      alt={variant.model || "Variant"}
                      className={cn("size-full", out && "opacity-50 grayscale")}
                      iconSize={24}
                    />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                      {variant.is_serialized ? (
                        <>
                          <Hash size={10} /> Serial no.
                        </>
                      ) : (
                        <>
                          <Layers size={10} /> By quantity
                        </>
                      )}
                    </span>
                    {out && (
                      <span className="absolute inset-x-0 bottom-0 bg-destructive/90 py-1 text-center text-[11px] font-semibold text-white">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {variant.model || "Default"}
                      </p>
                      {variant.sku && (
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {variant.sku}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold tabular-nums text-foreground">
                        {peso(Number(variant.price ?? 0))}
                      </span>
                      {!out && (
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            low
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              low ? "bg-amber-500" : "bg-emerald-500",
                            )}
                          />
                          {variant.available_count} left
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-3">
          <Button
            variant="outline"
            className="h-10 rounded-lg px-5 text-sm"
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SerialDialogProps = {
  variant: VariantRow | null;
  open: boolean;
  units?: StockUnitRecord[];
  onClose: () => void;
  onSelect: (serial: string) => void;
};

export function SerialDialog({
  variant,
  open,
  units: providedUnits,
  onClose,
  onSelect,
}: SerialDialogProps) {
  const [serialSearch, setSerialSearch] = useState("");
  const stockVariantId = variant?.variant_id ?? variant?.branch_item_id;
  const query = useStockUnitsByVariant(
    stockVariantId,
    { page: 1, per_page: 20, status: "available" },
    open && !!stockVariantId && !providedUnits,
  );
  const units = providedUnits ?? query.data?.data ?? [];
  const loading = !providedUnits && query.isLoading;
  const filteredUnits = useMemo(() => {
    const search = serialSearch.trim().toLowerCase();
    if (!search) return units;
    return units.filter((unit) =>
      unit.serial_number.toLowerCase().includes(search),
    );
  }, [serialSearch, units]);

  useEffect(() => {
    if (open) setSerialSearch("");
  }, [open, variant?.variant_id]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-5 py-4 text-left">
          <div className="flex items-center gap-3.5">
            {variant && (
              <ProductImage
                src={variantImage(variant)}
                alt={variant.model}
                className="size-14 shrink-0 rounded-xl border border-border/60"
                iconSize={20}
              />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg font-bold tracking-tight text-foreground">
                Pick a serial number
              </DialogTitle>
              <DialogDescription className="truncate text-xs text-muted-foreground">
                {variant?.item?.name}
                {variant?.model ? `, ${variant.model}` : ""}
              </DialogDescription>
              {variant && (
                <p className="mt-0.5 text-sm font-bold tabular-nums text-primary">
                  {peso(Number(variant.price ?? 0))}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 transition-shadow focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <Input
              value={serialSearch}
              onChange={(event) => setSerialSearch(event.target.value)}
              placeholder="Search serial number"
              aria-label="Search serial number"
              className="h-10 border-0 bg-transparent p-0 font-mono text-sm shadow-none placeholder:font-sans placeholder:text-muted-foreground/70 focus-visible:ring-0"
            />
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))
          ) : filteredUnits.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                {units.length === 0
                  ? "No serials available"
                  : "No matching serials"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {units.length === 0
                  ? "Every unit of this variant is already sold or reserved."
                  : "Try a different serial number."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUnits.map((unit) => (
              <button
                type="button"
                key={unit.stock_unit_id}
                onClick={() => onSelect(unit.serial_number)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Hash size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-sm font-medium text-foreground">
                    {unit.serial_number}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Check size={12} /> Add
                </span>
              </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-3">
          <Button
            variant="outline"
            className="h-10 rounded-lg px-5 text-sm"
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
