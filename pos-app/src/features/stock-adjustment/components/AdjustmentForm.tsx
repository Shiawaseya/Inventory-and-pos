import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type {
  StockAdjustmentReason,
  StockUnitItemPayload,
  StockUnitStatus,
} from "../types/index";
import { stockAdjustmentApi } from "../api/stockAdjustmentApi";

interface Props {
  branchId: number;
  onSuccess: () => void;
}

const REASONS: { value: StockAdjustmentReason; label: string }[] = [
  { value: "damaged", label: "Damaged Stock" },
  { value: "expired", label: "Expired" },
  { value: "lost_theft", label: "Lost / Stolen" },
  { value: "inventory_audit", label: "Audit Discrepancy" },
  { value: "internal_use", label: "Internal Use" },
  { value: "found_stock", label: "Found Stock" },
  { value: "other", label: "Other" },
];

const TARGET_STATUSES: { value: StockUnitStatus; label: string }[] = [
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "written_off", label: "Written Off" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "returned", label: "Returned" },
];

export function AdjustmentForm({ branchId, onSuccess }: Props) {
  const [reason, setReason] = useState<StockAdjustmentReason>("damaged");
  const [notes, setNotes] = useState("");
  const [serialQuery, setSerialQuery] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<StockUnitItemPayload[]>(
    [],
  );
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUnit = async () => {
    if (!serialQuery.trim()) return;
    setError(null);
    setSearching(true);

    try {
      const res = await stockAdjustmentApi.searchStockUnitBySerial(
        serialQuery.trim(),
      );
      if (!res.success || !res.data) {
        setError(res.message || "Stock unit not found or unavailable.");
        return;
      }

      const unit = res.data;
      const unitId = unit.id ?? unit.stock_unit_id;
      const serialNumber = unit.serial_number ?? serialQuery.trim();

      if (selectedUnits.some((u) => u.stock_unit_id === unitId)) {
        setError("This unit is already added to the adjustment list.");
        return;
      }

      setSelectedUnits((prev) => [
        ...prev,
        {
          stock_unit_id: unitId,
          serial_number: serialNumber,
          previous_status: unit.status as StockUnitStatus,
          new_status: "damaged",
          notes: "",
        },
      ]);
      setSerialQuery("");
    } catch {
      setError("An unexpected error occurred while searching for the unit.");
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

  const handleSubmit = async () => {
    if (selectedUnits.length === 0) {
      setError("Please add at least one stock unit to adjust.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await stockAdjustmentApi.create({
        branch_id: branchId,
        reason,
        notes: notes.trim() ? notes.trim() : undefined,
        items: selectedUnits.map((u) => ({
          stock_unit_id: u.stock_unit_id,
          new_status: u.new_status,
          notes: u.notes?.trim() ? u.notes.trim() : undefined,
        })),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create stock adjustment.");
      }

      setSelectedUnits([]);
      setNotes("");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Adjustment Reason</label>
          <Select
            value={reason}
            onValueChange={(val) => setReason(val as StockAdjustmentReason)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">General Notes</label>
          <Input
            placeholder="Audit remarks or incident details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="text-sm font-medium">
          Add Unit by Serial / Barcode
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Scan or type serial number..."
            value={serialQuery}
            onChange={(e) => setSerialQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUnit();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddUnit}
            disabled={searching}
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Add
          </Button>
        </div>
      </div>

      {selectedUnits.length > 0 && (
        <div className="border rounded-md mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Target Status</TableHead>
                <TableHead>Item Note</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedUnits.map((unit, idx) => (
                <TableRow key={unit.stock_unit_id}>
                  <TableCell className="font-mono font-medium text-xs">
                    {unit.serial_number}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground text-xs">
                    {unit.previous_status}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={unit.new_status}
                      onValueChange={(val) =>
                        handleUpdateItem(idx, "new_status", val)
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Scratched bezel"
                      value={unit.notes}
                      onChange={(e) =>
                        handleUpdateItem(idx, "notes", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/80 h-8 w-8"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedUnits.length === 0}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Commit Adjustment ({selectedUnits.length})
        </Button>
      </div>
    </div>
  );
}
