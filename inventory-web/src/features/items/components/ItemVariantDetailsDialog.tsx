import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  ImagePlus,
  Layers,
  List,
  Loader2,
  MoreVertical,
  Package,
  Pencil,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VariantSpecificationTable } from "./VariantSpecificationTable";
import {
  variantSpecificationsApi,
  type VariantSpecification,
} from "../api/variantSpecificationsApi";
import { variantsApi } from "../api/variantsApi";
import type { Item } from "../types/item";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
}

// Branch price comes from variant.branch_configuration.price (a number or numeric string).
function formatPrice(price?: number | string | null) {
  if (price === null || price === undefined || price === "") return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type ItemVariantDetailsDialogProps = {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: Item) => void;
  onConfigure?: (item: Item) => void;
  onShowVariants?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  /** Optional: called after a variant is saved so the parent can refetch. */
  onVariantUpdated?: () => void;
};

type VariantDraftValues = { model: string; sku: string };

export function ItemVariantDetailsDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onConfigure,
  onShowVariants,
  onDelete,
  onVariantUpdated,
}: ItemVariantDetailsDialogProps) {
  const variants = item?.variants || [];

  // One gallery for the whole item: the item photo first, then each variant's.
  const itemImage = resolveImageUrl(item?.imageUrl);
  const gallery = Array.from(
    new Set([itemImage, ...variants.map((v) => resolveImageUrl(v.image_url))]),
  ).filter(Boolean) as string[];

  const [variantIndex, setVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [specifications, setSpecifications] = useState<VariantSpecification[]>(
    [],
  );
  const [specificationsLoading, setSpecificationsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");
  const [initialSerial, setInitialSerial] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Values saved in this session, so labels stay correct before a refetch.
  const [saved, setSaved] = useState<Record<string, VariantDraftValues>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const valuesOf = (variant: (typeof variants)[number]): VariantDraftValues =>
    saved[String(variant.variant_id)] ?? {
      model: variant.model || "",
      sku: variant.sku || "",
    };

  const selectedVariant = variants[variantIndex] || null;
  const selectedValues = selectedVariant ? valuesOf(selectedVariant) : null;
  const selectedImage = imagePreview || gallery[imageIndex] || itemImage;
  const selectedConfig = (selectedVariant as any)?.branch_configuration;
  const selectedPrice = formatPrice(selectedConfig?.price);
  const selectedBranch: string | undefined = selectedConfig?.branch?.location;

  const variantKey = variants.map((v) => v.variant_id).join(",");

  const discardDraftImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const imageIndexFor = (variant?: (typeof variants)[number]) => {
    const url = resolveImageUrl(variant?.image_url);
    const index = url ? gallery.indexOf(url) : 0;
    return index >= 0 ? index : 0;
  };

  // Start fresh whenever the dialog opens or a different item is shown.
  useEffect(() => {
    if (!open) return;
    const first = variants[0];
    setVariantIndex(0);
    setModel(first?.model || "");
    setSku(first?.sku || "");
    setInitialSerial("");
    setImageIndex(imageIndexFor(first));
    setEditing(false);
    setSaved({});
    discardDraftImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variantKey]);

  useEffect(() => {
    if (!open) return;
    if (!selectedVariant?.variant_id) {
      setSpecifications([]);
      setSpecificationsLoading(false);
      return;
    }
    let cancelled = false;
    setSpecificationsLoading(true);
    variantSpecificationsApi
      .getByVariant(selectedVariant.variant_id)
      .then((response) => {
        if (cancelled) return;
        if (!response.success) {
          toast.error(response.message || "Failed to load specifications");
          setSpecifications([]);
        } else {
          setSpecifications(response.data || []);
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load specifications");
        setSpecifications([]);
      })
      .finally(() => {
        if (!cancelled) setSpecificationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedVariant?.variant_id]);

  const selectVariant = (nextIndex: number) => {
    if (!variants.length) return;
    const next = variants[nextIndex];
    const values = valuesOf(next);
    setVariantIndex(nextIndex);
    setModel(values.model);
    setSku(values.sku);
    setInitialSerial("");
    setImageIndex(imageIndexFor(next));
    setEditing(false);
    discardDraftImage();
  };

  const selectImage = (nextIndex: number) => {
    if (!gallery.length) return;
    setImageIndex((nextIndex + gallery.length) % gallery.length);
  };

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const startEditing = () => {
    if (!selectedValues) return;
    setModel(selectedValues.model);
    setSku(selectedValues.sku);
    setInitialSerial((selectedVariant as any)?.initial_serial_number ?? "");
    setEditing(true);
  };

  const cancelEditing = () => {
    if (selectedValues) {
      setModel(selectedValues.model);
      setSku(selectedValues.sku);
    }
    setInitialSerial("");
    discardDraftImage();
    setEditing(false);
  };

  const saveVariant = async () => {
    if (!selectedVariant?.variant_id || !model.trim() || !sku.trim()) {
      toast.error("Model and SKU are required");
      return;
    }
    setSaving(true);
    try {
      const response = await variantsApi.update(selectedVariant.variant_id, {
        model: model.trim(),
        sku: sku.trim(),
        is_active: selectedVariant.is_active,
        image: imageFile,
        initial_serial_number: initialSerial.trim() || null,
      } as any);
      if (!response.success) {
        toast.error(response.message || "Failed to update variant");
        return;
      }
      toast.success(response.message || "Variant updated");
      setSaved((prev) => ({
        ...prev,
        [String(selectedVariant.variant_id)]: {
          model: model.trim(),
          sku: sku.trim(),
        },
      }));
      setEditing(false);
      setImageFile(null); // keep the preview visible until the next switch
      onVariantUpdated?.();
    } catch {
      toast.error("Failed to update variant");
    } finally {
      setSaving(false);
    }
  };

  const closeAnd = (action?: (item: Item) => void) => () => {
    if (!item || !action) return;
    onOpenChange(false);
    action(item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-1rem)] max-w-4xl gap-0 overflow-y-auto p-0 sm:rounded-xl">
        {/* Header: what am I looking at, and what can I do with the item? */}
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b px-6 py-4 pr-14 text-left">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold leading-tight">
                {item?.name || "Product details"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <Layers className="h-3 w-3" />
                {variants.length === 0
                  ? "No variants yet"
                  : `${variants.length} ${variants.length === 1 ? "variant" : "variants"}`}
              </DialogDescription>
            </div>
          </div>

          {item && (onEdit || onConfigure || onShowVariants || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Item actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={closeAnd(onEdit)}>
                    <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit item
                  </DropdownMenuItem>
                )}
                {onShowVariants && (
                  <DropdownMenuItem onClick={closeAnd(onShowVariants)}>
                    <List className="mr-2 h-3.5 w-3.5" /> Manage variants
                  </DropdownMenuItem>
                )}
                {onConfigure && (
                  <DropdownMenuItem onClick={closeAnd(onConfigure)}>
                    <Settings className="mr-2 h-3.5 w-3.5" /> Configure branch
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="text-destructive"
                      onClick={closeAnd(onDelete)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete item
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DialogHeader>

        <div className="grid gap-6 p-5 md:grid-cols-12 md:gap-8 md:p-6">
          {/* Left: images. Stays in view while the right side scrolls. */}
          <section className="flex flex-col gap-3 md:col-span-5 md:sticky md:top-6 md:self-start">
            <div className="group relative aspect-square w-full overflow-hidden rounded-xl border bg-muted/30">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={selectedValues?.model || item?.name || "Product"}
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-8 w-8 opacity-30" />
                  No image available
                </div>
              )}

              {imagePreview && (
                <Badge className="absolute left-2.5 top-2.5">
                  New image · not saved
                </Badge>
              )}

              {gallery.length > 1 && !imagePreview && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                    onClick={() => selectImage(imageIndex - 1)}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                    onClick={() => selectImage(imageIndex + 1)}
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className="absolute bottom-2.5 right-2.5 text-xs tabular-nums"
                  >
                    {imageIndex + 1} / {gallery.length}
                  </Badge>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => selectImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={index === imageIndex && !imagePreview}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted/30 transition ${
                      index === imageIndex && !imagePreview
                        ? "border-primary ring-2 ring-primary/25"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Right: pick a variant → see/edit its details → read its specs. */}
          <section className="flex min-w-0 flex-col gap-6 md:col-span-7">
            {!variants.length ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
                <Layers className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">No variants yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add a variant to manage its model, SKU and specifications.
                  </p>
                </div>
                {item && onShowVariants && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeAnd(onShowVariants)}
                  >
                    <List className="mr-1.5 h-3.5 w-3.5" /> Manage variants
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 1. Variant picker (only when there is a choice to make) */}
                {variants.length > 1 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Variant</h3>
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      role="group"
                      aria-label="Choose a variant"
                    >
                      {variants.map((variant, index) => {
                        const values = valuesOf(variant);
                        const isSelected = index === variantIndex;
                        return (
                          <button
                            type="button"
                            key={variant.variant_id || index}
                            onClick={() => selectVariant(index)}
                            aria-pressed={isSelected}
                            className={`min-w-28 max-w-48 shrink-0 rounded-lg border px-3 py-2 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                : "bg-card hover:bg-muted/60"
                            } ${variant.is_active ? "" : "opacity-60"}`}
                          >
                            <span className="block truncate text-sm font-medium">
                              {values.model || "Untitled"}
                            </span>
                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {values.sku || "No SKU"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold tabular-nums text-foreground">
                              {formatPrice(
                                (variant as any).branch_configuration?.price,
                              ) ?? "Price not set"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Selected variant details + inline edit */}
                {selectedVariant && (
                  <div className="rounded-xl border bg-card">
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold">
                            {selectedValues?.model || "Untitled variant"}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              selectedVariant.is_active
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {selectedVariant.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="font-mono text-sm text-muted-foreground">
                          SKU: {selectedValues?.sku || "Not assigned"}
                        </p>
                        {selectedPrice ? (
                          <p className="text-lg font-bold tabular-nums text-foreground">
                            {selectedPrice}
                            {selectedBranch && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {selectedBranch}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-amber-600">
                            Branch price not configured
                          </p>
                        )}
                      </div>
                      {!editing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={startEditing}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                    </div>

                    {editing && (
                      <form
                        className="grid gap-4 border-t bg-muted/30 p-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void saveVariant();
                        }}
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="detail-variant-model">Model</Label>
                            <Input
                              id="detail-variant-model"
                              value={model}
                              onChange={(e) => setModel(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="detail-variant-sku">SKU</Label>
                            <Input
                              id="detail-variant-sku"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                              className="font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="detail-variant-initial-serial">
                            Initial serial
                          </Label>
                          <Input
                            id="detail-variant-initial-serial"
                            value={initialSerial}
                            onChange={(e) => setInitialSerial(e.target.value)}
                            placeholder="Optional: serial of the first unit"
                            className="font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            {imageFile
                              ? "Choose a different image"
                              : "Change image"}
                          </Button>
                          <span className="min-w-0 truncate text-sm text-muted-foreground">
                            {imageFile
                              ? imageFile.name
                              : "Keeping current image"}
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleImageChange(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={saving}
                            className="gap-1.5"
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            {saving ? "Saving…" : "Save changes"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 3. Specifications of the selected variant */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">Specifications</h3>
                    {!specificationsLoading && specifications.length > 0 && (
                      <Badge variant="secondary" className="tabular-nums">
                        {specifications.length}
                      </Badge>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <VariantSpecificationTable
                      specifications={specifications}
                      isLoading={specificationsLoading}
                      emptyMessage="No specifications added for this variant."
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ItemVariantDetailsDialog;
