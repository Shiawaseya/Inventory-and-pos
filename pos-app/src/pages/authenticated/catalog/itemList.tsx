import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ItemDialog,
  BranchItemSetter,
} from "../../../features/items/components";
import { useBranchItemMutation } from "@/features/items/mutations/useBranchItem";
import { toast } from "sonner";
import { ItemsCardGrid, ItemsTable } from "../../../features/items/view";
import VariantsDialog from "../../../features/items/components/VariantsDialog";
import { CatalogHeader } from "../layout/CatalogHeader";
// toast unused here; ItemDialog handles notifications

export default function CatalogPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [openBranchSetter, setOpenBranchSetter] = useState(false);
  const [createdItem, setCreatedItem] = useState<any | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const branchMutation = useBranchItemMutation();

  const handleBranchSave = async (payload: {
    itemId?: number;
    variant_id?: number;
    price?: number;
    restock_level?: number;
  }) => {
    try {
      const res = await branchMutation.mutateAsync({
        item_id: payload.itemId ?? createdItem?.id,
        variant_id: payload.variant_id ?? undefined,
        price: payload.price ?? null,
        reorder_level: payload.restock_level ?? null,
      } as any);

      if (!res || res.success === false) {
        const msg = (res as any)?.message || "Failed to save branch settings";
        // If backend indicates it's already configured or returned a server error, show dialog directing user to Inventory
        const normalized = String(msg || "").toLowerCase();
        const status = (res as any)?.status;
        if (
          status === 500 ||
          normalized.includes("already") ||
          normalized.includes("configured") ||
          normalized.includes("already configure") ||
          normalized.includes("database") ||
          normalized.includes("db error") ||
          normalized.includes("sql")
        ) {
          // Replace raw DB/server messages with a user-friendly message
          setAlreadyConfiguredMessage(
            "This item is already configured for your branch.",
          );
          setShowAlreadyConfigured(true);
          return;
        }

        toast.error(msg);
        return;
      }

      toast.success((res as any).message || "Branch settings saved");
      // keep dialog open until user closes; do not auto-close
    } catch (err: any) {
      toast.error(err?.message || "Failed to save branch settings");
    }
  };

  const [showAlreadyConfigured, setShowAlreadyConfigured] = useState(false);
  const [alreadyConfiguredMessage, setAlreadyConfiguredMessage] = useState<
    string | null
  >(null);

  // navigation removed: dialog will only close

  return (
    <div className="space-y-6">
      <CatalogHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddNew={() => setOpenItemDialog(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 h-[calc(100vh-300px)]">
        {/* Items View - Scrollable */}
        <div className="lg:col-span-3 overflow-y-auto pr-2">
          {viewMode === "grid" ? <ItemsCardGrid /> : <ItemsTable />}
        </div>
      </div>
      <ItemDialog
        open={openItemDialog}
        onOpenChange={setOpenItemDialog}
        onCreated={(res) => {
          // Normalize possible response shapes: res, res.data, res.data.data
          const inner = res?.data?.data ?? res?.data ?? res;
          if (!inner) return;

          const rawVariants =
            inner?.variants ?? inner?.data?.variants ?? inner?.models ?? [];
          const mappedVariants = Array.isArray(rawVariants)
            ? rawVariants.map((v: any) => ({
                variant_id: v.variant_id ?? v.id,
                item_id: v.item_id ?? inner.item_id ?? inner.id,
                model: v.model ?? v.name ?? String(v),
                sku: v.sku ?? undefined,
                is_active: v.is_active ?? undefined,
              }))
            : [];

          const itemObj = {
            id: inner.item_id ?? inner.id,
            name: inner.name,
            imageUrl: inner.image_url ?? null,
            category: null,
            brand: null,
            model: inner.model ? [inner.model] : (inner.models ?? []),
            isSerialized: Boolean(inner.is_serialized),
            variants: mappedVariants.length > 0 ? mappedVariants : undefined,
          } as any;

          setCreatedItem(itemObj);
          // open variants dialog so user can choose which variant to configure
          setVariantsOpen(true);
        }}
      />

      <VariantsDialog
        open={variantsOpen}
        onOpenChange={setVariantsOpen}
        item={createdItem}
        onSelectVariant={(v: any) => {
          setSelectedVariant(v);
          setVariantsOpen(true);
          setOpenBranchSetter(true);
        }}
      />

      <BranchItemSetter
        open={openBranchSetter}
        onOpenChange={setOpenBranchSetter}
        item={createdItem}
        variant={selectedVariant}
        onSave={handleBranchSave}
      />

      <Dialog
        open={showAlreadyConfigured}
        onOpenChange={setShowAlreadyConfigured}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already configured</DialogTitle>
            <DialogDescription>
              {alreadyConfiguredMessage ||
                "This item is already configured for your branch."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAlreadyConfigured(false)}
                className="flex-1"
              >
                Close
              </Button>
              {/* Navigation removed — dialog only closes */}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
