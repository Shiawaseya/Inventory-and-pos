import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ShieldAlert,
  History,
  ChevronRight,
  ChevronDown,
  Package2,
  Boxes,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import UpdateBranchItemDialog from "./UpdateBranchItemDialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type {
  GroupedInventoryItem,
  VariantRow,
} from "../lib/groupBySerializedItem";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type Props = {
  data: GroupedInventoryItem;
  onConfigure?: (variant: VariantRow) => void;
  onEdit?: (variant: VariantRow) => void;
  onShowUnits?: (variant: VariantRow) => void;
  selected?: boolean;
  onToggle?: (id: number, checked: boolean) => void;
};

export const InventoryItemSerializedColumn: React.FC<Props> = ({
  data,
  onConfigure,
  onEdit,
  onShowUnits,
  selected,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantRow | null>(null);
  const variants = data.variants ?? [];

  // Aggregated Stats
  const totalAvailable = variants.reduce(
    (s, v) => s + (v.available_count ?? 0),
    0,
  );
  const totalStock = variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
  const totalDamaged = variants.reduce((s, v) => s + (v.damaged_count || 0), 0);
  const totalReserved = variants.reduce(
    (s, v) => s + (v.reserved_count || 0),
    0,
  );

  const prices = variants
    .map((v) => v.price)
    .filter((p): p is number => p != null);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const isLowStock = variants.some(
    (v) =>
      v.reorder_level != null && v.available_count <= (v.reorder_level ?? 0),
  );
  const stockPercentage = Math.min(
    (totalAvailable / (totalStock || 1)) * 100,
    100,
  );

  return (
    <>
      {/* Parent Row */}
      <tr
        className={`group transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"}`}
      >
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!selected}
              onCheckedChange={(checked) => onToggle?.(data.item_id, !!checked)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
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
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Package2 className="size-5" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm leading-tight">
                {data.item.name}
              </span>
            </div>
          </div>
        </td>

        <td className="px-6 py-4">
          <span className="text-sm font-semibold text-foreground">
            {minPrice === maxPrice
              ? `₱${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`}
          </span>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isLowStock ? "bg-red-500 animate-pulse" : "bg-slate-300"}`}
            />
            <span
              className={`text-sm ${isLowStock ? "text-red-600 font-bold" : "text-muted-foreground"}`}
            >
              {variants[0]?.reorder_level ?? "—"}
            </span>
          </div>
        </td>

        <td className="px-6 py-4">
          <div className="flex flex-col gap-1.5 w-24">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-emerald-600">
                {totalAvailable}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                Qty
              </span>
            </div>
            <Progress value={stockPercentage} className="h-1" />
          </div>
        </td>

        <td className="px-6 py-4 text-center">
          <Badge variant="secondary" className="rounded-sm font-mono">
            {totalReserved}
          </Badge>
        </td>

        <td className="px-6 py-4">
          {totalDamaged > 0 ? (
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <ShieldAlert className="size-3.5" />
              <span className="text-sm">{totalDamaged}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </td>

        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
            <History className="size-3" />
            <span className="text-xs uppercase">
              {(variants[0]?.updated_at || "").split(" ")[0]}
            </span>
          </div>
        </td>

        <td className="px-6 py-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setEditingVariant(variants[0]);
                  setDialogOpen(true);
                }}
              >
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onConfigure?.(variants[0])}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Sub-Rows (Variants) */}
      {isExpanded &&
        variants.map((v) => (
          <tr
            key={v.branch_item_id}
            className="bg-muted/5 border-b border-border/5 text-xs"
          >
            <td />
            <td className="px-6 py-2">
              <div className="pl-14 border-l-2 border-primary/20 flex flex-col">
                <span className="font-medium text-muted-foreground">
                  {v.model ?? `Variant ${v.variant_id}`}
                </span>
                <span className="text-[10px] text-muted-foreground/60 italic">
                  SKU: {v.variant_id || v.branch_item_id}
                </span>
              </div>
            </td>
            <td className="px-6 py-2 font-medium">
              ₱{v.price?.toLocaleString()}
            </td>
            <td className="px-6 py-2 text-muted-foreground">
              {v.reorder_level ?? "—"}
            </td>
            <td className="px-6 py-2 font-bold text-emerald-500">
              {v.available_count}
            </td>
            <td className="px-6 py-2 text-center text-muted-foreground">
              {v.reserved_count}
            </td>
            <td className="px-6 py-2">
              {v.damaged_count > 0 ? (
                <span className="text-destructive">{v.damaged_count}</span>
              ) : (
                "—"
              )}
            </td>
            <td className="px-6 py-2 text-right text-muted-foreground/60">
              {v.updated_at?.split(" ")[0]}
            </td>
            <td className="px-6 py-2 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditingVariant(v);
                      setDialogOpen(true);
                      onEdit?.(v);
                    }}
                  >
                    <Pencil className="mr-2 size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onShowUnits?.(v)}>
                    <Boxes className="mr-2 size-3.5" />
                    Show Units
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      <UpdateBranchItemDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingVariant(null);
        }}
        variant={editingVariant ?? undefined}
        onUpdated={() => {
          setDialogOpen(false);
          setEditingVariant(null);
        }}
      />
    </>
  );
};

export default InventoryItemSerializedColumn;
