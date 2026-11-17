import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; //
import { Input } from "@/components/ui/input"; //
import { Label } from "@/components/ui/label"; //
import { Button } from "@/components/ui/button"; //
import { useBrand } from "@/features/items/mutations/useBrand"; //
import { loginApi } from "@/features/authentications/api/loginApi"; //
import { toast } from "sonner"; //
import type { BrandRecord } from "@/features/items/api/brandsApi";

type BrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: BrandRecord | null;
  onSuccess?: () => void;
};

export function BrandDialog({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createBrand, updateBrand } = useBrand();
  const isEditing = Boolean(brand?.brand_id);

  useEffect(() => {
    if (brand) {
      setName(brand.name ?? "");
    } else {
      setName("");
    }
    setError(null);
  }, [brand, open]);

  const handleClose = () => {
    setName("");
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

    setLoading(true);
    try {
      if (isEditing && brand?.brand_id) {
        const res = await updateBrand({
          id: brand.brand_id,
          payload: { name: trimmed },
        });

        if (!res || res.success === false) {
          throw new Error(res?.message || "Failed to update brand");
        }

        toast.success(res.message || "Brand updated successfully");
      } else {
        const user = loginApi.getUser(); //
        const recorded_by = user ? Number(user.employeeId) : undefined; //

        const res = await createBrand({
          name: trimmed,
          recorded_by,
        });

        if (!res || res.success === false) {
          throw new Error(res?.message || "Failed to create brand");
        }

        toast.success(res.message || "Brand created successfully");
      }

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
          <DialogTitle>{isEditing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the name of the catalog brand."
              : "Add a new brand to the catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
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
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BrandDialog;
