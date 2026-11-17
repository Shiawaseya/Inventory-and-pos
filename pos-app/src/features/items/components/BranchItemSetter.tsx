import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Item } from "../types/item";

type BranchItemSetterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  variant?: { variant_id?: number; model?: string; sku?: string } | null;
  initialPrice?: number | string;
  initialRestock?: number | string;
  onSave?: (payload: {
    itemId?: number;
    variant_id?: number;
    price?: number;
    restock_level?: number;
  }) => Promise<void> | void;
};

export function BranchItemSetter({
  open,
  onOpenChange,
  item = null,
  variant = null,
  initialPrice = "",
  initialRestock = "",
  onSave,
}: BranchItemSetterProps) {
  const [price, setPrice] = useState<string | number>(initialPrice ?? "");
  const [restock, setRestock] = useState<string | number>(initialRestock ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPrice(initialPrice ?? "");
    setRestock(initialRestock ?? "");
  }, [initialPrice, initialRestock, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    const payload = {
      itemId: item?.id,
      variant_id: (variant as any)?.variant_id ?? undefined,
      price: price === "" || price == null ? undefined : Number(price),
      restock_level:
        restock === "" || restock == null ? undefined : Number(restock),
    } as { itemId?: number; price?: number; restock_level?: number };

    try {
      setIsSaving(true);
      await onSave?.(payload);
      // Do not auto-close the dialog after saving — keep it open until user clicks Cancel/X
    } catch (err) {
      // Let the caller handle notification; rethrow so caller can catch and show toast
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set price and restock level at your branch</DialogTitle>
          <DialogDescription>
            Configure branch-specific price and restock level for this item.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1">
            <Label>Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground select-none pointer-events-none">
                ₱
              </span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min={0}
                step="0.01"
                className="pl-7"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Restock level</Label>
            <Input
              type="number"
              value={restock}
              onChange={(e) => setRestock(e.target.value)}
              placeholder="Units to trigger restock"
              min={0}
              step={1}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BranchItemSetter;
