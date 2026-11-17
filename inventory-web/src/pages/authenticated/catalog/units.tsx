import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  variantSpecificationsApi,
  type AttributeUnit,
} from "@/features/items/api/variantSpecificationsApi";

const byName = (a: AttributeUnit, b: AttributeUnit) =>
  (a.name || a.symbol).localeCompare(b.name || b.symbol);

export default function UnitsPage() {
  const [units, setUnits] = useState<AttributeUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  // Create / edit dialog (editing === null means "create")
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeUnit | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AttributeUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const response = await variantSpecificationsApi.getUnits();
    if (!response.success) {
      setLoadError(response.message || "Failed to load units");
    } else {
      setUnits([...(response.data || [])].sort(byName));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return units;
    return units.filter(
      (unit) =>
        (unit.name || "").toLowerCase().includes(term) ||
        unit.symbol.toLowerCase().includes(term),
    );
  }, [units, search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSymbol("");
    setError("");
    setOpen(true);
  };

  const openEdit = (unit: AttributeUnit) => {
    setEditing(unit);
    setName(unit.name || "");
    setSymbol(unit.symbol);
    setError("");
    setOpen(true);
  };

  const saveUnit = async () => {
    const nextName = name.trim();
    const nextSymbol = symbol.trim();
    if (!nextName || !nextSymbol) {
      setError("Enter both a unit name and symbol.");
      return;
    }
    if (
      units.some(
        (unit) =>
          unit.unit_id !== editing?.unit_id &&
          unit.symbol.toLowerCase() === nextSymbol.toLowerCase(),
      )
    ) {
      setError("A unit with this symbol already exists.");
      return;
    }
    if (
      editing &&
      nextName === (editing.name || "") &&
      nextSymbol === editing.symbol
    ) {
      setOpen(false);
      return;
    }

    setSaving(true);
    const payload = { name: nextName, symbol: nextSymbol };
    const response = editing
      ? await variantSpecificationsApi.updateUnit(editing.unit_id, payload)
      : await variantSpecificationsApi.createUnit(payload);

    if (!response.success) {
      setError(
        response.message ||
          (editing ? "Failed to update unit" : "Failed to create unit"),
      );
    } else {
      const saved = response.data!;
      setUnits((current) =>
        (editing
          ? current.map((unit) =>
              unit.unit_id === saved.unit_id ? saved : unit,
            )
          : [...current, saved]
        ).sort(byName),
      );
      toast.success(editing ? "Unit updated" : "Unit created");
      setOpen(false);
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await variantSpecificationsApi.deleteUnit(
      deleteTarget.unit_id,
    );
    if (!response.success) {
      toast.error(response.message || "Failed to delete unit");
    } else {
      setUnits((current) =>
        current.filter((unit) => unit.unit_id !== deleteTarget.unit_id),
      );
      toast.success("Unit deleted");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Measurement Units
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the global units available for numeric specifications.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {units.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or symbol"
            aria-label="Search units"
            className="pl-9"
          />
        </div>
      )}

      {loadError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Unit name</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {search
                      ? `No units match “${search.trim()}”.`
                      : "No units yet. Add one to use it in numeric specifications."}
                  </td>
                </tr>
              ) : (
                filtered.map((unit) => (
                  <tr key={unit.unit_id} className="border-t">
                    <td className="px-4 py-4 font-medium">
                      {unit.name || "-"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {unit.symbol}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(unit)}
                          aria-label={`Edit ${unit.name || unit.symbol}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(unit)}
                          aria-label={`Delete ${unit.name || unit.symbol}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {search && (
        <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
          <X className="mr-2 h-4 w-4" />
          Clear search
        </Button>
      )}

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit measurement unit" : "Add measurement unit"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes apply everywhere this unit is used."
                : "Add a global unit for numeric variant specifications."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveUnit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="unit-name">Unit name</Label>
              <Input
                id="unit-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Inches"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit-symbol">Symbol</Label>
              <Input
                id="unit-symbol"
                value={symbol}
                onChange={(event) => {
                  setSymbol(event.target.value);
                  setError("");
                }}
                placeholder="e.g. in"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !deleting && !next && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete unit?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name || deleteTarget?.symbol}” (
              {deleteTarget?.symbol}) will be removed. Units that are used by
              variant specifications can't be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
