import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/features/items/mutations/useBrand";
import { toast } from "sonner";
import type { BrandRecord } from "@/features/items/api/brandsApi";

type EditBrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandRecord | null;
  onSuccess?: () => void;
};

export function EditBrandDialog({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: EditBrandDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateBrand } = useBrand();

  useEffect(() => {
    if (brand) {
      setName(brand.name ?? "");
    }
    setError(null);
  }, [brand, open]);

  const handleClose = () => {
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Brand name is required");
      return;
    }

    if (!brand?.brand_id) {
      setError("No brand selected for editing");
      return;
    }

    setLoading(true);
    try {
      const res = await updateBrand({
        id: brand.brand_id,
        payload: { name: trimmed },
      });

      if (!res || res.success === false) {
        throw new Error(res?.message || "Failed to update brand");
      }

      toast.success(res.message || "Brand updated successfully");
      onSuccess?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>
            Update the brand name in the catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-brand-name">Brand Name</Label>
            <Input
              id="edit-brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Everest"
              autoFocus
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditBrandDialog;
