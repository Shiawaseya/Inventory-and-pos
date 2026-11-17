import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
                  {v.branch_configuration ? (
                    <div className="text-xs text-muted-foreground">
                      Price: ₱{v.branch_configuration.price?.toLocaleString() ?? "—"}
                      {" · "}Reorder: {v.branch_configuration.reorder_level ?? "—"}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600">
                      Branch price not configured
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      onSelectVariant?.(v);
                      onOpenChange(false);
                    }}
                  >
                    {v.branch_configuration
                      ? "Edit branch price & reorder"
                      : "Configure branch price"}
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
