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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// brand/category lists are provided by the picker hooks
import useBrandPicker from "@/features/items/hooks/useBrandPicker";
import useCategoryPicker from "@/features/items/hooks/useCategoryPicker";
import {
  ItemStoreProvider,
  useItemStore,
} from "@/features/items/store/itemStore";
import { useCreateItem } from "@/features/items/hooks/useCreateItem";
// Brand and category picker dialogs removed; using Select component instead
import { toast } from "sonner";

type ItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: any) => Promise<void> | void;
  onCreated?: (res: any) => void;
};

export function ItemDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: ItemDialogProps) {
  // picker hooks manage selection and expose brands/categories lists
  const brandPicker = useBrandPicker(null);
  const categoryPicker = useCategoryPicker(null);

  function ItemForm() {
    const {
      name,
      setName,
      setModel,
      models,
      setModels,
      isSerialized,
      setIsSerialized,
      setBrandId,
      setCategoryId,
      image,
      setImage,
      reset: resetItem,
    } = useItemStore();

    const createAction = useCreateItem();
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
    const [modelInput, setModelInput] = useState<string>("");

    const addModel = () => {
      const v = (modelInput || "").trim();
      if (!v) return;
      if (!models.includes(v)) {
        const next = [...models, v];
        setModels(next);
      }
      setModelInput("");
    };

    const removeModel = (index: number) => {
      const next = models.filter((_, i) => i !== index);
      setModels(next);
      setModel(next[0] ?? "");
    };

    useEffect(() => {
      if (!image) {
        setPreviewUrl(undefined);
        return;
      }
      const url = URL.createObjectURL(image as File);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [image]);

    const reset = () => {
      resetItem();
      brandPicker.reset();
      categoryPicker.reset();
    };

    const handleClose = () => {
      reset();
      onOpenChange(false);
    };

    const handleSubmit = async () => {
      try {
        const res = await createAction.submit({
          onCreate,
          onSuccess: handleClose,
        });
        // notify parent that an item was created with API response
        // `onCreated` can be used to open BranchItemSetter
        (onCreated as any)?.(res);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(message);
        throw err;
      }
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>Create a new inventory item.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          <div className="grid gap-1">
            <Label>Models</Label>
            <div className="flex gap-2">
              <Input
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="Type model and press Enter or click Add"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addModel();
                  }
                }}
              />
              <Button onClick={addModel}>Add</Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {models.map((m, idx) => (
                <div
                  key={`${m}-${idx}`}
                  className="flex items-center gap-2 px-2 py-1 bg-muted rounded-full text-sm"
                >
                  <span>{m}</span>
                  <button
                    type="button"
                    onClick={() => removeModel(idx)}
                    className="text-xs text-muted-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Add multiple models individually; each will be sent to the API.
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Serialized?</Label>
            <div className="flex items-center gap-2">
              <input
                id="is-serialized"
                type="checkbox"
                checked={isSerialized}
                onChange={(e) => setIsSerialized(e.target.checked)}
              />
              <label
                htmlFor="is-serialized"
                className="text-sm text-muted-foreground"
              >
                Tracks serial numbers
              </label>
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Brand</Label>
            <Select
              value={
                brandPicker.selectedId !== null
                  ? String(brandPicker.selectedId)
                  : ""
              }
              onValueChange={(val) => {
                const id = val ? Number(val) : null;
                brandPicker.selectById(id);
                setBrandId(id);
              }}
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
            <div className="text-xs text-muted-foreground mt-1">
              {brandPicker.brands?.length ?? 0} brands available
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Category</Label>
            <Select
              value={
                categoryPicker.selectedId !== null
                  ? String(categoryPicker.selectedId)
                  : ""
              }
              onValueChange={(val) => {
                const id = val ? Number(val) : null;
                categoryPicker.selectById(id);
                setCategoryId(id);
              }}
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
            <div className="text-xs text-muted-foreground mt-1">
              {categoryPicker.categories?.length ?? 0} categories available
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Image</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImage(f);
                }}
              />
              {previewUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-24 object-contain border rounded"
                  />
                  <Button variant="outline" onClick={() => setImage(null)}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createAction.isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createAction.isLoading}
              className="flex-1"
            >
              {createAction.isLoading ? "Saving..." : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <ItemStoreProvider>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl">
            <ItemForm />
          </DialogContent>
        </Dialog>
      </ItemStoreProvider>

      {/* category picker kept inline for now */}
    </>
  );
}

export default ItemDialog;
