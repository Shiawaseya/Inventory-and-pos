import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  History,
  ChevronRight,
  ChevronDown,
  Package2,
  Boxes,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  GroupedInventoryItem,
  VariantRow,
  Movement,
} from "../lib/groupBySerializedItem";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type Tone = "in" | "out" | "neutral";

const Num = ({
  value,
  tone = "neutral",
  always = false,
}: {
  value: number;
  tone?: Tone;
  always?: boolean;
}) =>
  value || always ? (
    <span
      className={cn(
        "tabular-nums",
        tone === "in" && "text-emerald-600 font-medium",
        tone === "out" && "text-red-600 font-medium",
        always && "font-semibold",
      )}
    >
      {value}
    </span>
  ) : (
    <span className="text-muted-foreground/40">—</span>
  );

function sumMovement(variants: VariantRow[]): Movement | null {
  const list = variants
    .map((v) => v.movement)
    .filter((m): m is Movement => !!m);
  if (!list.length) return null;
  const sum = (k: keyof Omit<Movement, "is_reconciled">) =>
    list.reduce((s, m) => s + (m[k] ?? 0), 0);
  return {
    beginning: sum("beginning"),
    stock_in: sum("stock_in"),
    void: sum("void"),
    lost: sum("lost"),
    damage: sum("damage"),
    written_off: sum("written_off"),
    stock_out: sum("stock_out"),
    found: sum("found"),
    ending: sum("ending"),
    is_reconciled: list.every((m) => m.is_reconciled),
  };
}

const MovementCells = ({
  m,
  cellClass,
}: {
  m: Movement | null | undefined;
  cellClass: string;
}) => {
  if (!m) {
    return (
      <>
        {Array.from({ length: 9 }).map((_, i) => (
          <td key={i} className={cn(cellClass, "text-center")}>
            <span className="text-muted-foreground/40">—</span>
          </td>
        ))}
      </>
    );
  }
  return (
    <>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.beginning} always />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.stock_in} tone="in" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.void} tone="in" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.lost} tone="out" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.damage} tone="out" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.written_off} tone="out" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.stock_out} tone="out" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <Num value={m.found} tone="in" />
      </td>
      <td className={cn(cellClass, "text-center")}>
        <span className="inline-flex items-center gap-1">
          <Num value={m.ending} always />
          {!m.is_reconciled && (
            <AlertTriangle
              className="size-3 text-amber-500"
              aria-label="History does not reconcile"
            />
          )}
        </span>
      </td>
    </>
  );
};

type Props = {
  data: GroupedInventoryItem;
  onShowUnits?: (variant: VariantRow) => void;
  selected?: boolean;
  onToggle?: (id: number, checked: boolean) => void;
  selectedVariants?: Set<number>;
  onToggleVariant?: (variant: VariantRow, checked: boolean) => void;
  showMovement?: boolean;
};

export const InventoryItemSerializedColumn: React.FC<Props> = ({
  data,
  onShowUnits,
  selected,
  onToggle,
  selectedVariants,
  onToggleVariant,
  showMovement = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const variants = data.variants ?? [];

  const totalAvailable = variants.reduce(
    (s, v) => s + (v.available_count ?? 0),
    0,
  );
  const isOutOfStock = totalAvailable <= 0;
  const movementTotals = showMovement ? sumMovement(variants) : null;

  return (
    <>
      {/* Parent Row */}
      <tr
        className={cn(
          "group transition-colors border-b",
          isExpanded ? "bg-muted/30" : "hover:bg-muted/10",
          isOutOfStock && "bg-destructive/[0.02]",
        )}
      >
        {/* Toggle & Expand */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={!!selected}
              onCheckedChange={(checked) => onToggle?.(data.item_id, !!checked)}
            />
            {variants.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            )}
          </div>
        </td>

        {/* Product Info */}
        <td className="px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
              {data.item.image_url ? (
                <img
                  src={
                    data.item.image_url.startsWith("/")
                      ? `${API_BASE_URL}${data.item.image_url}`
                      : data.item.image_url
                  }
                  alt={data.item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/60">
                  <Package2 className="size-5" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-snug">
                {data.item.name}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {variants.length} variant{variants.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </td>

        {showMovement && (
          <MovementCells m={movementTotals} cellClass="px-3 py-3.5 text-xs" />
        )}

        {/* Last Sync */}
        <td className="px-6 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
            <History className="size-3 opacity-60" />
            <span className="text-xs uppercase font-mono">
              {(variants[0]?.updated_at || "").split(" ")[0] || "—"}
            </span>
          </div>
        </td>
      </tr>

      {/* Sub-Rows (Variants) */}
      {isExpanded &&
        variants.map((v) => {
          const variantOutOfStock = (v.available_count ?? 0) <= 0;

          return (
            <tr
              key={v.branch_item_id}
              className={cn(
                "bg-muted/15 border-b border-border/40 text-xs transition-colors",
                variantOutOfStock && "bg-destructive/[0.03]",
              )}
            >
              <td className="px-4 py-2.5">
                <Checkbox
                  checked={selectedVariants?.has(v.branch_item_id) ?? false}
                  onCheckedChange={(checked) => onToggleVariant?.(v, !!checked)}
                />
              </td>
              <td className="px-6 py-2.5">
                <div className="pl-6 border-l-2 border-primary/30 flex flex-col">
                  <span className="font-medium text-foreground">
                    {v.model ?? `Variant ${v.variant_id}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SKU: {v.sku || v.variant_id || v.branch_item_id}
                  </span>
                </div>
              </td>
              {showMovement && (
                <MovementCells m={v.movement} cellClass="px-3 py-2.5 text-xs" />
              )}
              <td className="px-6 py-2.5 text-right text-muted-foreground/70">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => onShowUnits?.(v)}
                  >
                    <Boxes className="size-3" />
                    <span>Units</span>
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}

    </>
  );
};

export default InventoryItemSerializedColumn;
