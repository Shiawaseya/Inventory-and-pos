import type { Item } from "../types/item";
import { ItemCard, UpdateItemDialog } from "../components";
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
import { useItem } from "../queries/useItem";
import { useBranchItemMutation } from "../mutations/useBranchItem";

export const ItemsCardGrid = () => {
  const query = useItem();
  const items = query.data?.data ?? [];
  const [configureOpen, setConfigureOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const branchMutation = useBranchItemMutation();
  const [showAlreadyConfigured, setShowAlreadyConfigured] = useState(false);
  const [alreadyConfiguredMessage, setAlreadyConfiguredMessage] = useState<
    string | null
  >(null);

  const handleConfigure = (item: Item) => {
    setSelectedItem(item);
    setVariantsOpen(true);
  };

  const handleSave = async (payload: {
    itemId?: number;
    price?: number;
    restock_level?: number;
  }) => {
    try {
      console.log("handleSave: before mutate", {
        selectedItem,
        variantsOpen,
        selectedVariant,
        payload,
      });
      const res = await branchMutation.mutateAsync({
        item_id: payload.itemId ?? selectedItem?.id,
        variant_id: selectedVariant?.variant_id ?? undefined,
        price: payload.price ?? null,
        reorder_level: payload.restock_level ?? null,
      } as any);

      if (!res || res.success === false) {
        const msg = (res as any)?.message || "Failed to save branch settings";
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
      setConfigureOpen(false);
      console.log("handleSave: after mutate", {
        selectedItem,
        variantsOpen,
        selectedVariant,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save branch settings");
    }
  };

  // navigation removed: dialog will only close

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
        {items.map((item: Item) => (
          <ItemCard
            key={item.id}
            item={item}
            onConfigure={handleConfigure}
            onEdit={(it) => {
              setEditItem(it);
              setEditOpen(true);
            }}
          />
        ))}
      </div>

      <VariantsDialog
        open={variantsOpen}
        onOpenChange={setVariantsOpen}
        item={selectedItem}
        onSelectVariant={(v: any) => {
          setSelectedVariant(v);
          setConfigureOpen(true);
        }}
      />

      <BranchItemSetter
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        item={selectedItem}
        variant={selectedVariant}
        onSave={handleSave}
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
              <button
                className="btn btn-outline flex-1"
                onClick={() => setShowAlreadyConfigured(false)}
              >
                Close
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpdateItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        onUpdated={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
      />
    </>
  );
};
