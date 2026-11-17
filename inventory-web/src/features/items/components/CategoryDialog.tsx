import { useState } from "react";
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
import { loginApi } from "@/features/authentications/api/loginApi";
import { toast } from "sonner";
import useCategoryPicker from "@/features/items/hooks/useCategoryPicker";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: { name: string; recorded_by?: number | null }) => Promise<void> | void;
};

export function CategoryDialog({ open, onOpenChange, onCreate }: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCategory();
  const [pickerOpen, setPickerOpen] = useState(false);

  const reset = () => {
    setName("");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    try {
      const user = loginApi.getUser();
      const recorded_by = user ? Number(user.employeeId) : undefined;
      const payload: { name: string; recorded_by?: number | null } = { name: trimmed };
      if (recorded_by) payload.recorded_by = recorded_by;

      const res = await mutation.mutateAsync(payload);
      if (!res || (res && (res as any).success === false)) {
        const msg = (res as any).message || "Failed to create category";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success((res as any).message || "Category created");

      if (onCreate) await onCreate(payload);
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
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Add a new category to the catalog.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1">
            <Label>Name</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Consumables" />
              <Button variant="outline" onClick={() => setPickerOpen(true)}>Pick</Button>
            </div>
          </div>

          {/* recorded_by is derived from the current user and therefore not editable */}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <CategoryPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(c) => {
          setName(c.name);
        }}
      />
    </Dialog>
  );
}

// Embedded CategoryPickerDialog moved here and exported from this file
export function CategoryPickerDialog({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (v: boolean) => void; onSelect?: (c: { id?: number; name: string }) => void }) {
  const categoryPicker = useCategoryPicker(null);
  const { categories, isLoading, selected } = categoryPicker;

  const handleClose = () => onOpenChange(false);
  const handleConfirm = () => {
    const c = selected ?? null;
    if (c && onSelect) onSelect(c);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
          <DialogDescription>Choose a category for the item.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {isLoading ? (
            <div>Loading categories...</div>
          ) : !categories || categories.length === 0 ? (
            <div>No categories available.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {categories.map((c) => (
                <div
                  key={c.id || c.name}
                  className={`p-2 rounded cursor-pointer hover:bg-muted ${categoryPicker.selectedId === c.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => categoryPicker.selectById(c.id ?? null)}
                >
                  <div className="font-medium">{c.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1" disabled={selected === null}>
              Select
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CategoryDialog;
