import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Item, Variant } from "../types/item";

type VariantsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  onSelectVariant?: (variant: Variant) => void;
};

export default function VariantsDialog({
  open,
  onOpenChange,
  item = null,
  onSelectVariant,
}: VariantsDialogProps) {
  const variants =
    item?.variants ?? item?.model?.map((m) => ({ model: m })) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Variants for {item?.name}</DialogTitle>
          <DialogDescription>
            Select a variant to configure branch settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {variants.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No variants available for this item.
            </div>
          ) : (
            variants.map((v, idx) => (
              <div
                key={v.variant_id ?? `${v.model}-${idx}`}
                className="flex items-center justify-between gap-2 border rounded p-2"
              >
                <div>
                  <div className="font-medium">{v.model}</div>
                  {v.sku && (
                    <div className="text-xs text-muted-foreground">{v.sku}</div>
                  )}
                </div>
                <div>
                  <Button
                    onClick={() => {
                      onSelectVariant?.(v);
                      onOpenChange(false);
                    }}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
