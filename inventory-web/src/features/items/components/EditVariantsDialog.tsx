import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { variantsApi } from "../api/variantsApi";
import type { Item, Variant } from "../types/item";

type EditVariantsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
};

export default function EditVariantsDialog({
  open,
  onOpenChange,
  item = null,
}: EditVariantsDialogProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");
  const [initialSerialNumber, setInitialSerialNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const loadVariants = useCallback(async () => {
    if (!item?.id) return;
    setIsLoading(true);
    try {
      const response = await variantsApi.getByItem(item.id);
      if (!response.success) {
        toast.error(response.message || "Failed to load variants");
        return;
      }
      setVariants(response.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load variants",
      );
    } finally {
      setIsLoading(false);
    }
  }, [item?.id]);

  useEffect(() => {
    if (open) {
      setEditingVariant(null);
      void loadVariants();
    }
  }, [open, loadVariants]);

  const startEditing = (variant: Variant) => {
    setEditingVariant(variant);
    setModel(variant.model ?? "");
    setSku(variant.sku ?? "");
    setInitialSerialNumber(variant.initial_serial_number ?? "");
  };

  const saveVariant = async () => {
    if (!editingVariant?.variant_id) return;
    const nextModel = model.trim();
    const nextSku = sku.trim();
    const nextInitialSerialNumber = initialSerialNumber.trim();
    if (!nextModel || !nextSku) {
      toast.error("Model and SKU are required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await variantsApi.update(editingVariant.variant_id, {
        model: nextModel,
        sku: nextSku,
        initial_serial_number: nextInitialSerialNumber || null,
      });
      if (!response.success) {
        toast.error(response.message || "Failed to update variant");
        return;
      }
      setVariants((current) =>
        current.map((variant) =>
          variant.variant_id === editingVariant.variant_id
            ? {
                ...variant,
                model: nextModel,
                sku: nextSku,
                initial_serial_number: nextInitialSerialNumber || null,
              }
            : variant,
        ),
      );
      setEditingVariant(null);
      toast.success(response.message || "Variant updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update variant",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Variants for {item?.name}</DialogTitle>
          <DialogDescription>
            Review and update variant names, SKUs and initial serial numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadVariants()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading variants...
            </p>
          ) : variants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No variants available for this item.
            </p>
          ) : (
            variants.map((variant) => (
              <div
                key={variant.variant_id ?? `${variant.model}-${variant.sku}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{variant.model}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {variant.sku || "Not set"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${variant.model}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(variant)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onOpenChange(false);
                        navigate(
                          `/authenticated/catalog/variant-specifications?variant_id=${variant.variant_id}`,
                        );
                      }}
                      disabled={!variant.variant_id}
                    >
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> Variant
                      Specifications
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {editingVariant && (
          <div className="grid gap-3 border-t pt-4">
            <div className="grid gap-1">
              <Label htmlFor="variant-model">Model name</Label>
              <Input
                id="variant-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="variant-sku">SKU</Label>
              <Input
                id="variant-sku"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="variant-initial-serial">
                Initial Serial number
              </Label>
              <Input
                id="variant-initial-serial"
                value={initialSerialNumber}
                onChange={(event) => setInitialSerialNumber(event.target.value)}
                placeholder="e.g. SN-1000"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {editingVariant ? (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingVariant(null)}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void saveVariant()}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
