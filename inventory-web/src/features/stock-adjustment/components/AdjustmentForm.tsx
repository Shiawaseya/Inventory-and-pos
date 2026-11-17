import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  Loader2,
  Barcode,
  ArrowRight,
  AlertCircle,
  Package,
  Layers,
  FileText,
  CheckCircle2,
  X,
  ScanLine,
} from "lucide-react";
import type {
  StockAdjustmentReason,
  StockUnitItemPayload,
  StockUnitStatus,
} from "../types/index";
import { stockAdjustmentApi } from "../api/stockAdjustmentApi";

interface Props {
  branchId?: number;
  onSuccess: () => void;
}

const REASONS: { value: StockAdjustmentReason; label: string; desc: string }[] =
  [
    {
      value: "damaged",
      label: "Damaged Stock",
      desc: "Physical or transit defect",
    },
    { value: "expired", label: "Expired", desc: "Shelf life elapsed" },
    {
      value: "lost_theft",
      label: "Lost / Stolen",
      desc: "Missing from inventory",
    },
    {
      value: "inventory_audit",
      label: "Audit Discrepancy",
      desc: "Physical count reconciliation",
    },
    {
      value: "internal_use",
      label: "Internal Use",
      desc: "Store display or demo unit",
    },
    {
      value: "found_stock",
      label: "Found Stock",
      desc: "Surplus found during count",
    },
    {
      value: "inspection",
      label: "Inspection",
      desc: "Stock is awaiting inspection",
    },
    { value: "other", label: "Other", desc: "Miscellaneous adjustment" },
  ];

const TARGET_STATUSES: {
  value: StockUnitStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "under_inspection",
    label: "Under Inspection",
    badgeClass:
      "text-orange-700 bg-orange-50 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
  },
  {
    value: "damaged",
    label: "Damaged",
    badgeClass:
      "text-rose-700 bg-rose-50 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  {
    value: "lost",
    label: "Lost",
    badgeClass:
      "text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  {
    value: "written_off",
    label: "Written Off",
    badgeClass:
      "text-zinc-700 bg-zinc-100 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
  },
  {
    value: "available",
    label: "Available",
    badgeClass:
      "text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    value: "reserved",
    label: "Reserved",
    badgeClass:
      "text-sky-700 bg-sky-50 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  },
  {
    value: "returned",
    label: "Returned",
    badgeClass:
      "text-purple-700 bg-purple-50 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
];

export function AdjustmentForm({ branchId, onSuccess }: Props) {
  const [reason, setReason] = useState<StockAdjustmentReason>("damaged");
  const [notes, setNotes] = useState("");
  const [serialQuery, setSerialQuery] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<
    (StockUnitItemPayload & { product_name?: string })[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listStatus, setListStatus] =
    useState<StockUnitStatus>("under_inspection");
  const [listedUnits, setListedUnits] = useState<
    {
      stock_unit_id: number;
      serial_number: string;
      status: StockUnitStatus;
      product_name?: string | null;
    }[]
  >([]);
  const [selectedListedIds, setSelectedListedIds] = useState<number[]>([]);
  const [listing, setListing] = useState(false);

  const handleAddUnit = async () => {
    if (!serialQuery.trim()) return;
    setError(null);
    setSearching(true);

    try {
      const res = await stockAdjustmentApi.searchStockUnitBySerial(
        serialQuery.trim(),
      );
      if (!res.success || !res.data) {
        setError(
          res.message ||
            "Stock unit not found or not registered in your branch.",
        );
        return;
      }

      const unit = res.data;
      const unitId = unit.id ?? unit.stock_unit_id;
      const serialNumber = unit.serial_number ?? serialQuery.trim();

      if (selectedUnits.some((u) => u.stock_unit_id === unitId)) {
        setError(
          `Serial "${serialNumber}" is already in this adjustment batch.`,
        );
        return;
      }

      const defaultTarget: StockUnitStatus =
        reason === "inspection"
          ? "under_inspection"
          : reason === "found_stock"
          ? "available"
          : reason === "lost_theft"
            ? "lost"
            : reason === "internal_use"
              ? "reserved"
              : "damaged";

      setSelectedUnits((prev) => [
        {
          stock_unit_id: unitId,
          serial_number: serialNumber,
          previous_status: unit.status as StockUnitStatus,
          new_status: defaultTarget,
          product_name: unit.product_name,
          notes: "",
        },
        ...prev,
      ]);
      setSerialQuery("");
    } catch {
      setError(
        "An unexpected error occurred while looking up the serial number.",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateItem = (
    index: number,
    field: keyof StockUnitItemPayload,
    value: string,
  ) => {
    setSelectedUnits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleListByStatus = async () => {
    setListing(true);
    setError(null);
    try {
      const response = await stockAdjustmentApi.listStockUnitsByStatus(
        listStatus,
      );
      if (!response.success) {
        setError(response.message || "Failed to list stock units.");
        return;
      }
      setListedUnits(response.data);
      setSelectedListedIds([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to list stock units.",
      );
    } finally {
      setListing(false);
    }
  };

  const handleInsertListedUnits = () => {
    const unitsToInsert = listedUnits.filter((unit) =>
      selectedListedIds.includes(unit.stock_unit_id),
    );
    const existingIds = new Set(selectedUnits.map((unit) => unit.stock_unit_id));

    setSelectedUnits((prev) => [
      ...prev,
      ...unitsToInsert
        .filter((unit) => !existingIds.has(unit.stock_unit_id))
        .map((unit) => ({
          stock_unit_id: unit.stock_unit_id,
          serial_number: unit.serial_number,
          previous_status: unit.status,
          new_status: "available" as StockUnitStatus,
          product_name: unit.product_name ?? undefined,
          notes: "",
        })),
    ]);
    setListedUnits([]);
    setSelectedListedIds([]);
  };

  const handleSubmit = async () => {
    if (selectedUnits.length === 0) {
      setError("Please add at least one stock unit before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await stockAdjustmentApi.create({
        ...(branchId ? { branch_id: branchId } : {}),
        reason,
        notes: notes.trim() || undefined,
        items: selectedUnits.map((u) => ({
          stock_unit_id: u.stock_unit_id,
          new_status: u.new_status,
          notes: u.notes?.trim() || undefined,
        })),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to commit stock adjustment.");
      }

      setSelectedUnits([]);
      setNotes("");
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to submit adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-3.5 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive dark:bg-destructive/15">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" /> Adjustment Reason
          </label>
          <Select
            value={reason}
            onValueChange={(val) => setReason(val as StockAdjustmentReason)}
          >
            <SelectTrigger className="h-10 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  <div className="flex flex-col py-0.5">
                    <span className="font-semibold text-foreground">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.desc}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-8 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Audit
            Memo & Reference
          </label>
          <Input
            className="h-10 text-xs placeholder:text-muted-foreground/60"
            placeholder="e.g. Audit variance, transfer defect #104, demo retirement..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Scan & Fast Entry Bar */}
      <div className="p-4 rounded-xl border bg-muted/30 dark:bg-muted/15 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ScanLine className="h-3.5 w-3.5 text-primary" /> Scan / Enter Unit
            Serial
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border shadow-xs">
              Enter ↵
            </kbd>
            <span>to queue unit</span>
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUnit();
                }
              }}
              placeholder="Scan barcode or type exact serial number..."
              className="pl-10 h-10 font-mono text-xs tracking-wide bg-background shadow-xs focus-visible:ring-1"
            />
            {serialQuery && (
              <button
                type="button"
                onClick={() => setSerialQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            onClick={handleAddUnit}
            disabled={searching || !serialQuery.trim()}
            className="h-10 px-5 gap-2 text-xs font-semibold shrink-0 shadow-xs"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inspection queue
          </p>
          <p className="text-xs text-muted-foreground">
            Find stock units currently under inspection and select the units to
            inspect.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Select
            value={listStatus}
            onValueChange={(value) =>
              setListStatus(value as StockUnitStatus)
            }
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={handleListByStatus}
            disabled={listing}
            className="gap-2 text-xs"
          >
            {listing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            List {listStatus.replace("_", " ")}
          </Button>
        </div>
      </div>

      {listedUnits.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Under inspection units</p>
              <p className="text-xs text-muted-foreground">
                Select units to insert into the adjustment queue.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleInsertListedUnits}
              disabled={selectedListedIds.length === 0}
            >
              Insert in queue ({selectedListedIds.length})
            </Button>
          </div>
          <div className="divide-y rounded-lg border">
            {listedUnits.map((unit) => (
              <label
                key={unit.stock_unit_id}
                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/30"
              >
                <Checkbox
                  checked={selectedListedIds.includes(unit.stock_unit_id)}
                  onCheckedChange={(checked) =>
                    setSelectedListedIds((current) =>
                      checked
                        ? [...current, unit.stock_unit_id]
                        : current.filter((id) => id !== unit.stock_unit_id),
                    )
                  }
                />
                <span className="font-mono text-xs font-semibold">
                  {unit.serial_number}
                </span>
                <span className="text-xs text-muted-foreground">
                  {unit.product_name || "Individual Stock Unit"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Staged Units List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Queued Units
            </span>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0">
              {selectedUnits.length}
            </Badge>
          </div>

          {selectedUnits.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUnits([])}
              className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
            >
              Clear Batch
            </Button>
          )}
        </div>

        {selectedUnits.length === 0 ? (
          <div className="py-12 border border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/10 px-4">
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <Package className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No units staged for adjustment
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Scan barcode or type serial numbers above. You can assign
              individual conditions and remarks to each item.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl divide-y overflow-hidden shadow-xs bg-background">
            {selectedUnits.map((unit, idx) => (
              <div
                key={unit.stock_unit_id}
                className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                {/* Product & Serial */}
                <div className="flex items-center gap-3 min-w-[220px]">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Barcode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold tracking-tight text-foreground">
                      {unit.serial_number}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {unit.product_name || "Individual Stock Unit"}
                    </div>
                  </div>
                </div>

                {/* Target Status Transition */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono capitalize px-2 py-0.5 text-muted-foreground"
                  >
                    {unit.previous_status}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <Select
                    value={unit.new_status}
                    onValueChange={(val) =>
                      handleUpdateItem(idx, "new_status", val)
                    }
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_STATUSES.map((s) => (
                        <SelectItem
                          key={s.value}
                          value={s.value}
                          className="text-xs"
                        >
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Note Field */}
                <div className="flex-1 sm:max-w-xs">
                  <Input
                    value={unit.notes || ""}
                    onChange={(e) =>
                      handleUpdateItem(idx, "notes", e.target.value)
                    }
                    placeholder="Specific item remark..."
                    className="h-8 text-xs bg-muted/20 placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Delete Action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 self-end sm:self-auto"
                  onClick={() => handleRemoveItem(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submission Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          {selectedUnits.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {selectedUnits.length} item{selectedUnits.length > 1 ? "s" : ""}{" "}
              ready to commit
            </span>
          ) : (
            "Add at least one item serial to execute adjustment"
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedUnits.length === 0}
          className="w-full sm:w-auto min-w-[210px] h-10 gap-2 font-medium shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Committing Adjustments...</span>
            </>
          ) : (
            <>
              <span>Commit Adjustment Batch ({selectedUnits.length})</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
