import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import useBrandPicker from "@/features/items/hooks/useBrandPicker";
import useCategoryPicker from "@/features/items/hooks/useCategoryPicker";
import { toast } from "sonner";
import { useUpdateItemForm } from "@/features/items/mutations/useUpdateItemForm";
import type { Item } from "../types/item";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  onUpdated?: (res?: any) => void;
};

export default function UpdateItemDialog({
  open,
  onOpenChange,
  item = null,
  onUpdated,
}: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const brandPicker = useBrandPicker(item?.brand?.id ?? null);
  const categoryPicker = useCategoryPicker(item?.category?.id ?? null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [removedImage, setRemovedImage] = useState(false);
  const mutation = useUpdateItemForm();

  useEffect(() => {
    setName(item?.name ?? "");
    brandPicker.selectById(item?.brand?.id ?? null);
    categoryPicker.selectById(item?.category?.id ?? null);
    setImage(null);
    setPreviewUrl(undefined);
    setRemovedImage(false);
  }, [item, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!item?.id) return;
    try {
      const form = new FormData();
      form.append("name", String(name || "").trim());
      if (brandPicker.selectedId != null)
        form.append("brand_id", String(brandPicker.selectedId));
      if (categoryPicker.selectedId != null)
        form.append("category_id", String(categoryPicker.selectedId));
      if (removedImage) form.append("remove_image", "1");
      if (image) form.append("image", image as File);

      const res = await mutation.mutateAsync({ id: item.id, form });
      if (!res || res.success === false) {
        const msg = (res as any)?.message || "Failed to update item";
        toast.error(msg);
        return;
      }

      toast.success((res as any).message || "Item updated");
      onUpdated?.(res);
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update item details.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Brand</Label>
            <Select
              value={
                brandPicker.selectedId !== null
                  ? String(brandPicker.selectedId)
                  : ""
              }
              onValueChange={(val) =>
                brandPicker.selectById(val ? Number(val) : null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brandPicker.brands?.map((b) => (
                  <SelectItem key={b.id ?? b.name} value={String(b.id ?? "")}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label>Category</Label>
            <Select
              value={
                categoryPicker.selectedId !== null
                  ? String(categoryPicker.selectedId)
                  : ""
              }
              onValueChange={(val) =>
                categoryPicker.selectById(val ? Number(val) : null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryPicker.categories?.map((c) => (
                  <SelectItem key={c.id ?? c.name} value={String(c.id ?? "")}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label>Image</Label>
            {previewUrl ? (
              <div className="flex items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-24 w-24 object-contain border rounded"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(undefined);
                      setImage(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : item?.imageUrl && !removedImage ? (
              <div className="flex items-center gap-2">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-24 w-24 object-contain border rounded"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRemovedImage(true)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : null}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImage(f);
                if (f) {
                  const url = URL.createObjectURL(f);
                  setPreviewUrl(url);
                  setRemovedImage(false);
                } else {
                  setPreviewUrl(undefined);
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={mutation.status === "pending"}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={mutation.status === "pending"}
              className="flex-1"
            >
              {mutation.status === "pending" ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
