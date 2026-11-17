import type { Item, Variant } from "../types/item";
import { EditVariantsDialog, ItemCard, UpdateItemDialog } from "../components";
import { ItemVariantDetailsDialog } from "../components/ItemVariantDetailsDialog";
import BranchItemSetter from "../components/BranchItemSetter";
import VariantsDialog from "../components/VariantsDialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useItem } from "../queries/useItem";
import { useBranchItemMutation } from "../mutations/useBranchItem";
import { useUpdateBranchItem } from "../mutations/useUpdateBranchItem";
import { PackageOpen, RefreshCw, TriangleAlert } from "lucide-react";

export const ItemsCardGrid = () => {
  const query = useItem();
  const items = query.data?.data ?? [];
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;

  const [configureOpen, setConfigureOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [editVariantsOpen, setEditVariantsOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [detailsItem, setDetailsItem] = useState<Item | null>(null);
  const branchMutation = useBranchItemMutation();
  const updateBranchMutation = useUpdateBranchItem();
  const [showAlreadyConfigured, setShowAlreadyConfigured] = useState(false);
  const [alreadyConfiguredMessage, setAlreadyConfiguredMessage] = useState<
    string | null
  >(null);

  const handleConfigure = (item: Item) => {
    setSelectedItem(item);
    setVariantsOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleShowVariants = (item: Item) => {
    setSelectedItem(item);
    setEditVariantsOpen(true);
  };

  const handleDelete = (item: Item) => {
    toast.info(`Delete requested for ${item.name}`);
  };

  const handleSave = async (payload: {
    itemId?: number;
    price?: number;
    restock_level?: number;
  }) => {
    try {
      if (selectedVariant?.branch_configuration) {
        if (!selectedVariant.branch_item_id) {
          toast.error("This configured variant is missing its branch item ID.");
          return;
        }

        const res = await updateBranchMutation.mutateAsync({
          id: selectedVariant.branch_item_id,
          payload: {
            price: payload.price ?? null,
            reorder_level: payload.restock_level ?? "",
          },
        });

        if (!res || res.success === false) {
          toast.error(res?.message || "Failed to update branch settings");
          return;
        }

        toast.success(res.message || "Branch settings updated");
        setConfigureOpen(false);
        return;
      }

      const res = await branchMutation.mutateAsync({
        item_id: payload.itemId ?? selectedItem?.id,
        variant_id: selectedVariant?.variant_id ?? undefined,
        price: payload.price ?? null,
        reorder_level: payload.restock_level ?? null,
      });

      if (!res || res.success === false) {
        const msg = res.message || "Failed to save branch settings";
        const normalized = String(msg || "").toLowerCase();
        const status = res.status;
        if (
          status === 500 ||
          normalized.includes("already") ||
          normalized.includes("configured") ||
          normalized.includes("already configure") ||
          normalized.includes("database") ||
          normalized.includes("db error") ||
          normalized.includes("sql")
        ) {
          setAlreadyConfiguredMessage(
            "This item is already configured for your branch.",
          );
          setShowAlreadyConfigured(true);
          return;
        }

        toast.error(msg);
        return;
      }

      toast.success(res.message || "Branch settings saved");
      setConfigureOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save branch settings",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="aspect-[4/3] animate-pulse bg-muted" />
            <div className="space-y-2 p-3.5">
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Couldn't load the catalog
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The server didn't respond. Try again in a moment."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => query.refetch()}
        >
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <PackageOpen className="size-5" strokeWidth={1.5} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            No items found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Nothing matches your search or filters. Clear them to see the full
            catalog, or add a new item.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Responsive Product Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4">
        {items.map((item: Item) => (
          <ItemCard
            key={item.id}
            item={item}
            onClick={(selected) => setDetailsItem(selected)}
            onConfigure={handleConfigure}
            onShowVariants={handleShowVariants}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Select Variant Before Branch Configuration */}
      <VariantsDialog
        open={variantsOpen}
        onOpenChange={setVariantsOpen}
        item={selectedItem}
        onSelectVariant={(v) => {
          setSelectedVariant(v);
          setConfigureOpen(true);
        }}
      />

      {/* Edit Variants List */}
      <EditVariantsDialog
        open={editVariantsOpen}
        onOpenChange={setEditVariantsOpen}
        item={selectedItem}
      />

      {/* Branch Price & Reorder Setting Dialog */}
      <BranchItemSetter
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        item={selectedItem}
        variant={selectedVariant}
        initialPrice={selectedVariant?.branch_configuration?.price ?? ""}
        initialRestock={
          selectedVariant?.branch_configuration?.reorder_level ?? ""
        }
        onSave={handleSave}
      />

      {/* Already Configured Notice Dialog */}
      <Dialog
        open={showAlreadyConfigured}
        onOpenChange={setShowAlreadyConfigured}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already set up for this branch</DialogTitle>
            <DialogDescription>
              {alreadyConfiguredMessage ||
                "This item is already configured for your branch."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAlreadyConfigured(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Base Info Dialog */}
      <UpdateItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        onUpdated={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
      />

      {/* Item Variant Details Modal With Action Menu Options Attached */}
      <ItemVariantDetailsDialog
        key={detailsItem?.id ?? "item-details-empty"}
        item={detailsItem}
        open={Boolean(detailsItem)}
        onOpenChange={(open) => {
          if (!open) setDetailsItem(null);
        }}
        onEdit={handleEdit}
        onConfigure={handleConfigure}
        onShowVariants={handleShowVariants}
        onDelete={handleDelete}
      />
    </>
  );
};

export default ItemsCardGrid;
