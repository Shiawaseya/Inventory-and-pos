import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { useUpdateBranchItem } from "@/features/items/mutations/useUpdateBranchItem";
import type { VariantRow } from "../lib/groupBySerializedItem";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: VariantRow | null;
  onUpdated?: (res?: any) => void;
};

export default function UpdateBranchItemDialog({
  open,
  onOpenChange,
  variant = null,
  onUpdated,
}: Props) {
  const [price, setPrice] = useState<string>("");
  const [reorder, setReorder] = useState<string>("");
  const mutation = useUpdateBranchItem();

  useEffect(() => {
    setPrice(variant?.price != null ? String(variant.price) : "");
    setReorder(
      variant?.reorder_level != null ? String(variant.reorder_level) : "",
    );
  }, [variant, open]);

  const handleClose = () => onOpenChange(false);

  const handleSave = async () => {
    if (!variant) return;

    try {
      const payload: any = {};
      if (price !== "") payload.price = Number(price);
      // send empty string to clear server-side NULL, otherwise number
      if (reorder !== "") payload.reorder_level = Number(reorder);
      if (reorder === "") payload.reorder_level = "";

      const res = await mutation.mutateAsync({
        id: variant.branch_item_id,
        payload,
      });
      if (!res || res.success === false) {
        toast.error((res as any)?.message || "Failed to update branch item");
        return;
      }

      toast.success((res as any)?.message || "Branch item updated");
      onUpdated?.(res);
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update branch item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
          <DialogDescription>Update price and reorder level.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1">
            <Label>Price</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 123.45"
              inputMode="decimal"
            />
          </div>

          <div className="grid gap-1">
            <Label>Reorder Level (leave empty to clear)</Label>
            <Input
              value={reorder}
              onChange={(e) => setReorder(e.target.value)}
              placeholder="e.g. 5"
              inputMode="numeric"
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={mutation.isLoading}
              className="flex-1"
            >
              {mutation.isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
