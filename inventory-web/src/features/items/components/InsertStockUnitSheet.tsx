import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useInsertStockUnitStore } from "@/features/items/store/insertStockUnit";
import { useStockUnit } from "@/features/items/mutations/useStockUnit";
import { X, Plus, CheckCircle2, Printer } from "lucide-react";
import { toast } from "sonner";
import { notifyStockUnitsInserted } from "@/features/notifications";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  type RestockCreatedUnit,
  type RestockSkippedUnit,
} from "@/features/items/api/stockUnitApi";
import { printSerialTags } from "@/lib/PrintSerialtag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

type ItemRow = {
  branch_item_id: number;
  variant_id?: number;
  model?: string | null;
  variant_model?: string | null;
  initial_serial_number?: string | null;
  item_id: number;
  branch_id: number;
  price: number | null;
  reorder_level: number | null;
  updated_at: string;
  is_serialized: boolean;
  stock_quantity: number;
  reserved_count: number;
  damaged_count: number;
  available_count: number;
  item: { name: string; image_url: string | null };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemRow[];
};

type RestockResult = {
  created: RestockCreatedUnit[];
  skipped: RestockSkippedUnit[];
};

function RestockResultDialog({
  result,
  items,
  onOpenChange,
}: {
  result: RestockResult | null;
  items: ItemRow[];
  onOpenChange: (open: boolean) => void;
}) {
  const getItem = (variantId: number) =>
    items.find((item) => (item.variant_id ?? item.item_id) === variantId);

  const handlePrint = () => {
    if (!result) return;

    printSerialTags(
      result.created.map((unit) => {
        const item = getItem(unit.variant_id);
        return {
          serialNumber: unit.serial_number,
          itemName: item?.item.name ?? `Variant #${unit.variant_id}`,
          model: item?.variant_model ?? item?.model,
        };
      }),
    );
  };

  return (
    <Dialog open={result !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Restock completed</DialogTitle>
          <DialogDescription>
            Review the stock units that were created or skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Created ({result?.created.length ?? 0})
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                disabled={!result?.created.length}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print serial tags
              </Button>
            </div>
            {result?.created.length ? (
              <div className="space-y-2">
                {result.created.map((unit) => (
                  <div
                    key={unit.stock_unit_id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="font-mono">{unit.serial_number}</div>
                    <div className="text-muted-foreground">
                      Status: {unit.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No stock units were created.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">
              Skipped ({result?.skipped.length ?? 0})
            </h3>
            {result?.skipped.length ? (
              <div className="space-y-2">
                {result.skipped.map((unit) => (
                  <div
                    key={`${unit.variant_id}-${unit.serial}`}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="font-mono">{unit.serial}</div>
                    <div className="text-muted-foreground">
                      Reason: {unit.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No stock units were skipped.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InsertStockUnitSheet({
  open,
  onOpenChange,
  items,
}: Props) {
  const store = useInsertStockUnitStore();
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const initialSerials = useRef<Record<number, string>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [restockResult, setRestockResult] = useState<RestockResult | null>(
    null,
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<
    "available" | "under_inspection" | null
  >(null);

  const entries = store.entries;
  useEffect(() => {
    if (!open) return;
    initialSerials.current = Object.fromEntries(
      items.map((item) => [
        item.variant_id ?? item.item_id,
        item.initial_serial_number?.trim() ?? "",
      ]),
    );
    setInputs(
      Object.fromEntries(
        items.map((item) => [
          item.variant_id ?? item.item_id,
          item.initial_serial_number?.trim() ?? "",
        ]),
      ),
    );
  }, [open, items]);
  const selectedItems = useMemo(() => items, [items]);
  const totalSerials = Object.values(entries).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const mutation = useStockUnit();
  const handleAdd = (id: number) => {
    const v = (inputs[id] || "").trim();
    if (!v) return;
    store.addSerial(id, v);
    if (initialSerials.current[id] !== v) {
      setInputs((s) => ({ ...s, [id]: "" }));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: number,
  ) => {
    if (e.key === "Enter") {
      handleAdd(id);
    } else if (e.key === "Tab") {
      e.preventDefault();
      restoreInitialSerial(id);
      inputRefs.current[id]?.focus();
    }
  };

  const restoreInitialSerial = (id: number) => {
    if (inputs[id]?.trim()) return;
    const initialSerial = initialSerials.current[id];
    if (initialSerial) {
      setInputs((s) => ({ ...s, [id]: initialSerial }));
    }
  };

  const handleAddInitial = (id: number) => {
    const initialSerial = initialSerials.current[id];
    if (!initialSerial) return;
    store.addSerial(id, initialSerial);
    setInputs((s) => ({ ...s, [id]: initialSerial }));
    inputRefs.current[id]?.focus();
  };

  const handleRestock = async (status: "available" | "under_inspection") => {
    if (totalSerials === 0) return;

    setSubmittingStatus(status);
    const payload = {
      status,
      items: Object.entries(entries)
        .map(([k, arr]) => ({ variant_id: Number(k), serials: arr }))
        .filter((r) => r.serials && r.serials.length > 0),
    };

    const summary = payload.items.map((entry) => {
      const row = selectedItems.find(
        (it) => (it.variant_id ?? it.item_id) === entry.variant_id,
      );
      return {
        variant_id: entry.variant_id,
        name: row?.item.name ?? `Variant #${entry.variant_id}`,
        model: row?.variant_model ?? row?.model ?? null,
        serials: entry.serials.length,
      };
    });

    try {
      const response = await mutation.mutateAsync(payload);
      payload.items.forEach((it) => store.clearItem(it.variant_id));
      setConfirmationOpen(false);
      onOpenChange(false);
      notifyStockUnitsInserted(summary, loginApi.getUser()?.branchId);
      setRestockResult(response.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save stock units", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-2xl flex flex-col overflow-hidden"
        >
        <SheetHeader className="border-b pb-4">
          <div>
            <SheetTitle className="text-2xl mb-2">
              Insert Stock Units
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Add serial numbers for {selectedItems.length} item
              {selectedItems.length !== 1 ? "s" : ""} • {totalSerials} added
            </p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-0">
          <div className="space-y-3 p-4">
            {selectedItems.map((it) => {
              const img = it.item.image_url;
              const src = img
                ? img.startsWith("/")
                  ? `${API_BASE_URL}${img}`
                  : img
                : "/no-picture-icon-no-image-sign-no-album-photo-icon-vector.jpg";
              const key = it.variant_id ?? it.item_id;
              const itemSerials = entries[key] || [];

              return (
                <Card
                  key={key}
                  className="border overflow-hidden transition-all hover:shadow-sm"
                >
                  <CardContent className="p-4">
                    {/* Item Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                      <div className="relative shrink-0">
                        <img
                          src={src}
                          alt={it.item.name}
                          className="h-14 w-14 object-cover rounded-lg bg-muted border border-border"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/no-picture-icon-no-image-sign-no-album-photo-icon-vector.jpg";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {it.item.name}
                        </h3>
                        {/* Variant label */}
                        {(it.variant_model ||
                          it.model ||
                          (it.variant_id
                            ? `Variant #${it.variant_id}`
                            : null)) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">
                              {it.variant_model ??
                                it.model ??
                                `Variant #${it.variant_id}`}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Stock:{" "}
                          <span className="font-medium">
                            {it.stock_quantity}
                          </span>{" "}
                          • Available:{" "}
                          <span className="font-medium">
                            {it.available_count}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Input Section */}
                    <div className="space-y-2 mb-4">
                      <label className="text-xs font-medium text-muted-foreground">
                        Add Serial Number
                      </label>
                      <div className="flex gap-2">
                        <Input
                          ref={(element) => {
                            inputRefs.current[key] = element;
                          }}
                          value={inputs[key] ?? ""}
                          onChange={(e) =>
                            setInputs((s) => ({ ...s, [key]: e.target.value }))
                          }
                          onKeyDown={(e) => handleKeyDown(e, key)}
                          onBlur={() => restoreInitialSerial(key)}
                          placeholder="e.g. SN-12345"
                          className="text-sm"
                          autoComplete="off"
                        />
                        {initialSerials.current[key] && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleAddInitial(key)}
                            className="shrink-0"
                          >
                            Add initial
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => handleAdd(key)}
                          disabled={!inputs[key]?.trim()}
                          size="sm"
                          className="shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Serials Display */}
                    {itemSerials.length > 0 ? (
                      <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium">
                            Added ({itemSerials.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {itemSerials.map((serial) => (
                            <Badge
                              key={serial}
                              variant="secondary"
                              className="text-xs font-mono gap-1 pl-2 pr-1 py-1"
                            >
                              {serial}
                              <button
                                onClick={() => store.removeSerial(key, serial)}
                                className="ml-1 hover:text-destructive transition-colors"
                                title="Remove serial"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        No serials added yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <SheetFooter className="border-t pt-4 mt-4 flex gap-2 flex-row justify-end">
          <Button
            variant="outline"
            onClick={() => {
              store.clearAll();
              onOpenChange(false);
            }}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            onClick={() => setConfirmationOpen(true)}
            disabled={totalSerials === 0}
            className="flex-1 sm:flex-initial"
          >
            Save {totalSerials > 0 ? `(${totalSerials})` : ""}
          </Button>
        </SheetFooter>
        </SheetContent>
      </Sheet>
      <Dialog
        open={confirmationOpen}
        onOpenChange={(isOpen) => !submittingStatus && setConfirmationOpen(isOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm restock status</DialogTitle>
            <DialogDescription>
              Choose the status to record for the {totalSerials} restocked serial
              {totalSerials !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => handleRestock("under_inspection")}
              disabled={!!submittingStatus}
            >
              {submittingStatus === "under_inspection"
                ? "Saving..."
                : "Under inspection"}
            </Button>
            <Button
              onClick={() => handleRestock("available")}
              disabled={!!submittingStatus}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {submittingStatus === "available"
                ? "Saving..."
                : "Inspection passed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RestockResultDialog
        result={restockResult}
        items={selectedItems}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRestockResult(null);
        }}
      />
    </>
  );
}
