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
import { useCategory } from "@/features/items/mutations/useCategory";
import { toast } from "sonner";
import type { CategoryRecord } from "@/features/items/api/categoriesApi";

type EditCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRecord | null;
  onSuccess?: () => void;
};

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateCategory } = useCategory();

  useEffect(() => {
    if (category) {
      setName(category.name ?? "");
    }
    setError(null);
  }, [category, open]);

  const handleClose = () => {
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }

    if (!category?.category_id) {
      setError("No category selected for editing");
      return;
    }

    setLoading(true);
    try {
      const res = await updateCategory({
        id: category.category_id,
        payload: { name: trimmed },
      });

      if (!res || res.success === false) {
        throw new Error(res?.message || "Failed to update category");
      }

      toast.success(res.message || "Category updated successfully");
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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category name in the catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-category-name">Category Name</Label>
            <Input
              id="edit-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Appliances"
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

export default EditCategoryDialog;
