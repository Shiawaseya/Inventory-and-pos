import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  variantSpecificationsApi,
  type AttributeOption,
  type ItemAttribute,
  type SpecificationDataType,
} from "@/features/items/api/variantSpecificationsApi";

type OptionState = Record<number, AttributeOption[]>;

function readableType(dataType: SpecificationDataType) {
  return dataType.charAt(0).toUpperCase() + dataType.slice(1);
}

const byName = (a: ItemAttribute, b: ItemAttribute) =>
  a.name.localeCompare(b.name);

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<ItemAttribute[]>([]);
  const [options, setOptions] = useState<OptionState>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  // Create / edit attribute dialog (editing === null means "create")
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemAttribute | null>(null);
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<SpecificationDataType | "">("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete attribute
  const [deleteTarget, setDeleteTarget] = useState<ItemAttribute | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Options panel
  const [optionValue, setOptionValue] = useState("");
  const [optionError, setOptionError] = useState("");
  const [savingOption, setSavingOption] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState("");
  const [optionEditError, setOptionEditError] = useState("");
  const [busyOptionId, setBusyOptionId] = useState<number | null>(null);
  const [deleteOptionTarget, setDeleteOptionTarget] =
    useState<AttributeOption | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const response = await variantSpecificationsApi.getAttributes();
    if (!response.success) {
      setLoadError(response.message || "Failed to load attributes");
      setLoading(false);
      return;
    }

    const nextAttributes = [...(response.data || [])].sort(byName);
    setAttributes(nextAttributes);

    const optionResponses = await Promise.all(
      nextAttributes
        .filter((attribute) => attribute.data_type === "option")
        .map(async (attribute) => {
          const result = await variantSpecificationsApi.getOptions(
            attribute.attribute_id,
          );
          return [attribute.attribute_id, result] as const;
        }),
    );
    if (optionResponses.some(([, result]) => !result.success)) {
      toast.error("Some attribute options could not be loaded.");
    }
    setOptions(
      Object.fromEntries(
        optionResponses.map(([id, result]) => [id, result.data || []]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return attributes;
    return attributes.filter(
      (attribute) =>
        attribute.name.toLowerCase().includes(term) ||
        attribute.data_type.includes(term),
    );
  }, [attributes, search]);

  /* ---------- attribute create / edit / delete ---------- */

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDataType("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (attribute: ItemAttribute) => {
    setEditing(attribute);
    setName(attribute.name);
    setDataType(attribute.data_type);
    setFormError("");
    setDialogOpen(true);
  };

  const saveAttribute = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !dataType) {
      setFormError("Enter an attribute name and select a data type.");
      return;
    }
    if (
      attributes.some(
        (attribute) =>
          attribute.attribute_id !== editing?.attribute_id &&
          attribute.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setFormError("An attribute with this name already exists.");
      return;
    }
    if (editing && trimmedName === editing.name) {
      setDialogOpen(false);
      return;
    }

    setSaving(true);
    const response = editing
      ? await variantSpecificationsApi.updateAttribute(editing.attribute_id, {
          name: trimmedName,
        })
      : await variantSpecificationsApi.createAttribute({
          name: trimmedName,
          data_type: dataType,
        });

    if (!response.success) {
      setFormError(
        response.message ||
          (editing
            ? "Failed to update attribute"
            : "Failed to create attribute"),
      );
    } else {
      const saved = response.data!;
      setAttributes((current) =>
        (editing
          ? current.map((attribute) =>
              attribute.attribute_id === saved.attribute_id ? saved : attribute,
            )
          : [...current, saved]
        ).sort(byName),
      );
      toast.success(editing ? "Attribute updated" : "Attribute created");
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const confirmDeleteAttribute = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await variantSpecificationsApi.deleteAttribute(
      deleteTarget.attribute_id,
    );
    if (!response.success) {
      toast.error(response.message || "Failed to delete attribute");
    } else {
      const id = deleteTarget.attribute_id;
      setAttributes((current) =>
        current.filter((attribute) => attribute.attribute_id !== id),
      );
      setOptions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (expandedId === id) setExpandedId(null);
      toast.success("Attribute deleted");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  /* ---------- options ---------- */

  const toggleOptions = (attribute: ItemAttribute) => {
    setExpandedId((current) =>
      current === attribute.attribute_id ? null : attribute.attribute_id,
    );
    setOptionValue("");
    setOptionError("");
    setEditingOptionId(null);
  };

  const addOption = async (attribute: ItemAttribute) => {
    const trimmedValue = optionValue.trim();
    if (!trimmedValue) {
      setOptionError("Enter an option value.");
      return;
    }
    if (
      (options[attribute.attribute_id] || []).some(
        (option) =>
          option.option_value.toLowerCase() === trimmedValue.toLowerCase(),
      )
    ) {
      setOptionError("This option already exists for the attribute.");
      return;
    }
    setSavingOption(true);
    const response = await variantSpecificationsApi.createOption({
      attribute_id: attribute.attribute_id,
      option_value: trimmedValue,
    });
    if (!response.success) {
      setOptionError(response.message || "Failed to add option");
    } else {
      toast.success("Option added");
      setOptions((current) => ({
        ...current,
        [attribute.attribute_id]: [
          ...(current[attribute.attribute_id] || []),
          response.data!,
        ],
      }));
      setOptionValue("");
      setOptionError("");
    }
    setSavingOption(false);
  };

  const startEditOption = (option: AttributeOption) => {
    setEditingOptionId(option.option_id);
    setEditingOptionValue(option.option_value);
    setOptionEditError("");
  };

  const saveOptionEdit = async (attribute: ItemAttribute) => {
    if (editingOptionId === null) return;
    const trimmedValue = editingOptionValue.trim();
    const current = options[attribute.attribute_id] || [];
    const original = current.find((o) => o.option_id === editingOptionId);

    if (!trimmedValue) {
      setOptionEditError("Enter an option value.");
      return;
    }
    if (original && trimmedValue === original.option_value) {
      setEditingOptionId(null);
      return;
    }
    if (
      current.some(
        (option) =>
          option.option_id !== editingOptionId &&
          option.option_value.toLowerCase() === trimmedValue.toLowerCase(),
      )
    ) {
      setOptionEditError("This option already exists for the attribute.");
      return;
    }

    setBusyOptionId(editingOptionId);
    const response = await variantSpecificationsApi.updateOption(
      editingOptionId,
      { option_value: trimmedValue },
    );
    if (!response.success) {
      setOptionEditError(response.message || "Failed to update option");
    } else {
      setOptions((state) => ({
        ...state,
        [attribute.attribute_id]: (state[attribute.attribute_id] || []).map(
          (option) =>
            option.option_id === editingOptionId ? response.data! : option,
        ),
      }));
      toast.success("Option updated");
      setEditingOptionId(null);
    }
    setBusyOptionId(null);
  };

  const confirmDeleteOption = async (attribute: ItemAttribute) => {
    if (!deleteOptionTarget) return;
    const target = deleteOptionTarget;
    setBusyOptionId(target.option_id);
    const response = await variantSpecificationsApi.deleteOption(
      target.option_id,
    );
    if (!response.success) {
      toast.error(response.message || "Failed to delete option");
    } else {
      setOptions((state) => ({
        ...state,
        [attribute.attribute_id]: (state[attribute.attribute_id] || []).filter(
          (option) => option.option_id !== target.option_id,
        ),
      }));
      toast.success("Option deleted");
    }
    setBusyOptionId(null);
    setDeleteOptionTarget(null);
  };

  const expandedAttribute =
    expandedId !== null
      ? attributes.find((item) => item.attribute_id === expandedId)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Attributes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define the fields available to product variants.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Attribute
        </Button>
      </div>

      {attributes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or data type"
              aria-label="Search attributes"
              className="pl-9"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
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
          <table className="w-full min-w-155 text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Attribute name</th>
                <th className="px-4 py-3 font-medium">Data type</th>
                <th className="px-4 py-3 font-medium">Number of options</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading attributes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {search
                      ? `No attributes match “${search.trim()}”.`
                      : "No attributes yet. Add one to start describing variants."}
                  </td>
                </tr>
              ) : (
                filtered.map((attribute) => {
                  const isExpanded = expandedId === attribute.attribute_id;
                  const count = (options[attribute.attribute_id] || []).length;
                  return (
                    <tr
                      key={attribute.attribute_id}
                      className={`border-t align-top ${isExpanded ? "bg-muted/30" : ""}`}
                    >
                      <td className="px-4 py-4 font-medium">
                        {attribute.name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {readableType(attribute.data_type)}
                      </td>
                      <td className="px-4 py-4">
                        {attribute.data_type === "option" ? count : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          {attribute.data_type === "option" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleOptions(attribute)}
                              className="gap-2"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              Options
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(attribute)}
                            aria-label={`Edit ${attribute.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(attribute)}
                            aria-label={`Delete ${attribute.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {expandedAttribute && (
        <section className="space-y-4 border-y py-4">
          <div>
            <h2 className="text-lg font-semibold">
              Options for {expandedAttribute.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Options are available when this attribute is used on a variant.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(options[expandedAttribute.attribute_id] || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No options have been added yet.
              </p>
            ) : (
              (options[expandedAttribute.attribute_id] || []).map((option) =>
                editingOptionId === option.option_id ? (
                  <div key={option.option_id} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingOptionValue}
                        onChange={(event) => {
                          setEditingOptionValue(event.target.value);
                          setOptionEditError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveOptionEdit(expandedAttribute);
                          }
                          if (event.key === "Escape") setEditingOptionId(null);
                        }}
                        className="h-9 w-44"
                        aria-label="Option value"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => void saveOptionEdit(expandedAttribute)}
                        disabled={busyOptionId === option.option_id}
                        aria-label="Save option"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => setEditingOptionId(null)}
                        aria-label="Cancel editing option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {optionEditError && (
                      <p className="text-sm text-destructive" role="alert">
                        {optionEditError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    key={option.option_id}
                    className="flex items-center gap-1 rounded-md border py-1 pl-3 pr-1"
                  >
                    <span>{option.option_value}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => startEditOption(option)}
                      aria-label={`Edit option ${option.option_value}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteOptionTarget(option)}
                      aria-label={`Delete option ${option.option_value}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ),
              )
            )}
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-start"
            onSubmit={(event) => {
              event.preventDefault();
              void addOption(expandedAttribute);
            }}
          >
            <div className="w-full sm:max-w-sm">
              <Label htmlFor="option-value">New option</Label>
              <Input
                id="option-value"
                value={optionValue}
                onChange={(event) => {
                  setOptionValue(event.target.value);
                  setOptionError("");
                }}
                placeholder="Enter an option value"
                aria-describedby={optionError ? "option-error" : undefined}
              />
              {optionError && (
                <p
                  id="option-error"
                  className="mt-1 text-sm text-destructive"
                  role="alert"
                >
                  {optionError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={savingOption}
              className="gap-2 sm:mt-6"
            >
              <Plus className="h-4 w-4" />
              {savingOption ? "Adding..." : "Add Option"}
            </Button>
          </form>
        </section>
      )}

      {/* Create / edit attribute */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => !saving && setDialogOpen(next)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit attribute" : "Add attribute"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename this attribute. The data type is fixed once an attribute exists."
                : "Create a reusable attribute for variant specifications."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAttribute();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="attribute-name">Attribute name</Label>
              <Input
                id="attribute-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                placeholder="e.g. Screen Size"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attribute-type">Data type</Label>
              <Select
                value={dataType}
                onValueChange={(value) => {
                  setDataType(value as SpecificationDataType);
                  setFormError("");
                }}
                disabled={editing !== null}
              >
                <SelectTrigger id="attribute-type">
                  <SelectValue placeholder="Select a data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="option">Option</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create attribute"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete attribute */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !deleting && !next && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete attribute?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” will be removed. Attributes that are used
              by variant specifications, or that still have options, can't be
              deleted.
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
              onClick={() => void confirmDeleteAttribute()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete attribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete option */}
      <Dialog
        open={deleteOptionTarget !== null}
        onOpenChange={(next) =>
          busyOptionId === null && !next && setDeleteOptionTarget(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete option?</DialogTitle>
            <DialogDescription>
              “{deleteOptionTarget?.option_value}” will be removed from{" "}
              {expandedAttribute?.name}. Options already used by a variant can't
              be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOptionTarget(null)}
              disabled={busyOptionId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                expandedAttribute && void confirmDeleteOption(expandedAttribute)
              }
              disabled={busyOptionId !== null}
            >
              {busyOptionId !== null ? "Deleting..." : "Delete option"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
