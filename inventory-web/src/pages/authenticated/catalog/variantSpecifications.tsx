import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  Eye,
  Hash,
  Layers,
  ListFilter,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { VariantSpecificationTable } from "@/features/items/components/VariantSpecificationTable";
import {
  variantSpecificationsApi,
  type AttributeOption,
  type AttributeUnit,
  type ItemAttribute,
  type SpecificationDataType,
  type SpecificationPayload,
  type VariantSpecification,
} from "@/features/items/api/variantSpecificationsApi";

type FormValue = {
  optionId: string;
  numericValue: string;
  unitId: string;
  textValue: string;
};

const emptyFormValue: FormValue = {
  optionId: "",
  numericValue: "",
  unitId: "",
  textValue: "",
};

function formValueFromSpecification(
  specification: VariantSpecification,
): FormValue {
  return {
    optionId: specification.option_id ? String(specification.option_id) : "",
    numericValue:
      specification.numeric_value == null
        ? ""
        : String(specification.numeric_value),
    unitId: specification.unit_id ? String(specification.unit_id) : "",
    textValue: specification.text_value || "",
  };
}

function DataTypeBadge({ dataType }: { dataType: SpecificationDataType }) {
  switch (dataType) {
    case "option":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
        >
          <ListFilter className="size-3" />
          <span>Option</span>
        </Badge>
      );
    case "numeric":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Hash className="size-3" />
          <span>Numeric</span>
        </Badge>
      );
    case "text":
    default:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <Type className="size-3" />
          <span>Text</span>
        </Badge>
      );
  }
}

function validateValue(
  dataType: SpecificationDataType,
  value: FormValue,
): string | null {
  if (dataType === "option" && !value.optionId) {
    return "Please select an option for this attribute.";
  }
  if (
    dataType === "numeric" &&
    (!value.numericValue.trim() || !Number.isFinite(Number(value.numericValue)))
  ) {
    return "Please enter a valid number.";
  }
  if (dataType === "text" && !value.textValue.trim()) {
    return "Please provide a text value.";
  }
  return null;
}

function buildPayload(
  attribute: ItemAttribute,
  value: FormValue,
): SpecificationPayload {
  if (attribute.data_type === "option") {
    return {
      attribute_id: attribute.attribute_id,
      option_id: Number(value.optionId),
    };
  }
  if (attribute.data_type === "numeric") {
    return {
      attribute_id: attribute.attribute_id,
      numeric_value: value.numericValue.trim(),
      ...(value.unitId ? { unit_id: Number(value.unitId) } : {}),
    };
  }
  return {
    attribute_id: attribute.attribute_id,
    text_value: value.textValue.trim(),
  };
}

type ValueEditorProps = {
  attribute: ItemAttribute;
  value: FormValue;
  options: AttributeOption[];
  units: AttributeUnit[];
  optionsLoading?: boolean;
  onChange: (value: FormValue) => void;
};

function ValueEditor({
  attribute,
  value,
  options,
  units,
  optionsLoading,
  onChange,
}: ValueEditorProps) {
  const [optionSearch, setOptionSearch] = useState("");
  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        option.option_value.toLowerCase().includes(optionSearch.toLowerCase()),
      ),
    [options, optionSearch],
  );

  if (attribute.data_type === "option") {
    return (
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Select
          value={value.optionId}
          onValueChange={(optionId) => onChange({ ...value, optionId })}
          disabled={optionsLoading}
        >
          <SelectTrigger className="h-9 w-full bg-background text-sm shadow-xs transition-colors">
            <SelectValue
              placeholder={
                optionsLoading ? "Loading options..." : "Select an option..."
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <div className="p-1">
              <Input
                value={optionSearch}
                onChange={(e) => setOptionSearch(e.target.value)}
                placeholder="Search options..."
                className="mb-1 h-8 text-xs"
              />
            </div>
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-xs text-muted-foreground">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => (
                <SelectItem
                  key={option.option_id}
                  value={String(option.option_id)}
                  className="cursor-pointer text-xs"
                >
                  {option.option_value}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (attribute.data_type === "numeric") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:max-w-md">
        <Input
          type="number"
          inputMode="decimal"
          value={value.numericValue}
          onChange={(event) =>
            onChange({ ...value, numericValue: event.target.value })
          }
          placeholder="0.00"
          className="h-9 bg-background font-mono text-sm shadow-xs"
        />
        <Select
          value={value.unitId}
          onValueChange={(unitId) => onChange({ ...value, unitId })}
        >
          <SelectTrigger className="h-9 bg-background text-xs shadow-xs">
            <SelectValue placeholder="Unit (optional)" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem
                key={unit.unit_id}
                value={String(unit.unit_id)}
                className="cursor-pointer text-xs"
              >
                {unit.name ? `${unit.name} (${unit.symbol})` : unit.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="sm:max-w-md">
      <Input
        value={value.textValue}
        onChange={(event) =>
          onChange({ ...value, textValue: event.target.value })
        }
        placeholder="Enter specification value..."
        className="h-9 bg-background text-sm shadow-xs"
      />
    </div>
  );
}

type VariantSpecificationsPageProps = {
  variantId?: number;
};

export default function VariantSpecificationsPage({
  variantId: selectedVariantId,
}: VariantSpecificationsPageProps = {}) {
  const [searchParams] = useSearchParams();
  const routeVariantId = Number(searchParams.get("variant_id"));
  const variantId = selectedVariantId ?? routeVariantId;
  const hasVariant = Number.isInteger(variantId) && variantId > 0;

  const [attributes, setAttributes] = useState<ItemAttribute[]>([]);
  const [units, setUnits] = useState<AttributeUnit[]>([]);
  const [specifications, setSpecifications] = useState<VariantSpecification[]>(
    [],
  );
  const [initialValues, setInitialValues] = useState<Record<number, FormValue>>(
    {},
  );
  const [values, setValues] = useState<Record<number, FormValue>>({});
  const [options, setOptions] = useState<Record<number, AttributeOption[]>>({});
  const [optionsLoading, setOptionsLoading] = useState<Record<number, boolean>>(
    {},
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(hasVariant);
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newAttributeId, setNewAttributeId] = useState("");
  const [newValue, setNewValue] = useState<FormValue>(emptyFormValue);
  const [addError, setAddError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VariantSpecification | null>(
    null,
  );

  const attributeMap = useMemo(
    () =>
      new Map(
        attributes.map((attribute) => [attribute.attribute_id, attribute]),
      ),
    [attributes],
  );

  const newAttribute = newAttributeId
    ? attributeMap.get(Number(newAttributeId))
    : undefined;

  const usedAttributeIds = useMemo(
    () => new Set(specifications.map((s) => s.attribute_id)),
    [specifications],
  );

  const availableAttributes = useMemo(
    () => attributes.filter((a) => !usedAttributeIds.has(a.attribute_id)),
    [attributes, usedAttributeIds],
  );

  const loadOptions = useCallback(
    async (attributeId: number) => {
      if (options[attributeId]) return;
      setOptionsLoading((current) => ({ ...current, [attributeId]: true }));
      const response = await variantSpecificationsApi.getOptions(attributeId);
      if (!response.success) {
        toast.error(response.message || "Failed to load options");
      } else {
        setOptions((current) => ({
          ...current,
          [attributeId]: response.data || [],
        }));
      }
      setOptionsLoading((current) => ({ ...current, [attributeId]: false }));
    },
    [options],
  );

  useEffect(() => {
    if (!hasVariant) return;
    let cancelled = false;

    Promise.all([
      variantSpecificationsApi.getAttributes(),
      variantSpecificationsApi.getUnits(),
      variantSpecificationsApi.getByVariant(variantId),
    ])
      .then(([attributeResponse, unitResponse, specificationResponse]) => {
        if (cancelled) return;
        if (!attributeResponse.success)
          toast.error(attributeResponse.message || "Failed to load attributes");
        else setAttributes(attributeResponse.data || []);

        if (unitResponse.success) setUnits(unitResponse.data || []);

        if (!specificationResponse.success) {
          toast.error(
            specificationResponse.message || "Failed to load specifications",
          );
        } else {
          const nextSpecifications = specificationResponse.data || [];
          setSpecifications(nextSpecifications);
          const mappedValues = Object.fromEntries(
            nextSpecifications.map((specification) => [
              specification.attribute_id,
              formValueFromSpecification(specification),
            ]),
          );
          setValues(mappedValues);
          setInitialValues(mappedValues);
        }
      })
      .catch(() => toast.error("Failed to load variant specifications"))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasVariant, variantId]);

  useEffect(() => {
    specifications.forEach((specification) => {
      const attribute = attributeMap.get(specification.attribute_id);
      if (attribute?.data_type === "option") {
        void loadOptions(specification.attribute_id);
      }
    });
  }, [specifications, attributeMap, loadOptions]);

  const updateValue = (attributeId: number, value: FormValue) => {
    setValues((current) => ({ ...current, [attributeId]: value }));
    setErrors((current) => ({ ...current, [attributeId]: "" }));
  };

  const isRowDirty = (attributeId: number) => {
    const initial = initialValues[attributeId];
    const current = values[attributeId];
    if (!initial || !current) return false;
    return (
      initial.optionId !== current.optionId ||
      initial.numericValue !== current.numericValue ||
      initial.unitId !== current.unitId ||
      initial.textValue !== current.textValue
    );
  };

  const handleResetRow = (attributeId: number) => {
    if (initialValues[attributeId]) {
      setValues((prev) => ({
        ...prev,
        [attributeId]: initialValues[attributeId],
      }));
      setErrors((prev) => ({ ...prev, [attributeId]: "" }));
    }
  };

  const saveSpecification = async (
    attribute: ItemAttribute,
    value: FormValue,
    existing: boolean,
  ) => {
    const validationError = validateValue(attribute.data_type, value);
    if (validationError) {
      if (existing) {
        setErrors((current) => ({
          ...current,
          [attribute.attribute_id]: validationError,
        }));
      } else {
        setAddError(validationError);
      }
      return;
    }

    setIsSaving((current) => ({ ...current, [attribute.attribute_id]: true }));
    const payload = buildPayload(attribute, value);

    const response = existing
      ? await variantSpecificationsApi.update(
          variantId,
          attribute.attribute_id,
          payload,
        )
      : await variantSpecificationsApi.create(variantId, payload);

    if (!response.success) {
      toast.error(response.message || "Failed to save specification");
    } else {
      toast.success(existing ? "Specification updated" : "Specification added");
      const updatedSpec = valueToSpecification(
        attribute,
        value,
        options[attribute.attribute_id],
        units,
      );

      if (existing) {
        setSpecifications((current) =>
          current.map((s) =>
            s.attribute_id === attribute.attribute_id
              ? { ...s, ...updatedSpec }
              : s,
          ),
        );
        setInitialValues((prev) => ({
          ...prev,
          [attribute.attribute_id]: value,
        }));
      } else {
        setSpecifications((current) => [
          ...current,
          {
            ...updatedSpec,
            attribute_id: attribute.attribute_id,
            data_type: attribute.data_type,
            name: attribute.name,
          },
        ]);
        setValues((prev) => ({ ...prev, [attribute.attribute_id]: value }));
        setInitialValues((prev) => ({
          ...prev,
          [attribute.attribute_id]: value,
        }));
        setAddOpen(false);
        setNewAttributeId("");
        setNewValue(emptyFormValue);
      }
    }
    setIsSaving((current) => ({ ...current, [attribute.attribute_id]: false }));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const response = await variantSpecificationsApi.remove(
      variantId,
      deleteTarget.attribute_id,
    );
    if (!response.success) {
      toast.error(response.message || "Failed to delete specification");
    } else {
      setSpecifications((current) =>
        current.filter((s) => s.attribute_id !== deleteTarget.attribute_id),
      );
      setValues((current) => {
        const next = { ...current };
        delete next[deleteTarget.attribute_id];
        return next;
      });
      setInitialValues((current) => {
        const next = { ...current };
        delete next[deleteTarget.attribute_id];
        return next;
      });
      toast.success("Specification deleted");
    }
    setDeleteTarget(null);
  };

  if (!hasVariant) {
    return (
      <div className="flex h-96 w-full items-center justify-center p-6">
        <Card className="max-w-md border-dashed text-center">
          <CardHeader className="pb-3">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <SlidersHorizontal className="size-6 text-muted-foreground" />
            </div>
            <CardTitle>Variant Context Required</CardTitle>
            <CardDescription>
              Please navigate to this page with a valid product variant
              specified in the URL query string.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              ?variant_id=[id]
            </code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Variant Specifications
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              ID: #{variantId}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure technical attributes, dimensions, and product
            specifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setAddOpen((open) => !open);
              setAddError("");
            }}
            disabled={availableAttributes.length === 0}
            className="gap-2 shadow-xs"
          >
            <Plus className="size-4" />
            Add Specification
          </Button>
        </div>
      </div>

      {/* Add Specification Expandable Drawer */}
      {addOpen && (
        <Card className="border-primary/20 bg-primary/[0.02] shadow-sm transition-all duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Add New Specification
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setAddOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <CardDescription>
              Choose an available attribute and set its value for this variant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="new-attribute"
                  className="text-xs font-semibold"
                >
                  Attribute Name
                </Label>
                <Select
                  value={newAttributeId}
                  onValueChange={(attributeId) => {
                    setNewAttributeId(attributeId);
                    setNewValue(emptyFormValue);
                    setAddError("");
                    const attribute = attributeMap.get(Number(attributeId));
                    if (attribute?.data_type === "option") {
                      void loadOptions(attribute.attribute_id);
                    }
                  }}
                >
                  <SelectTrigger
                    id="new-attribute"
                    className="h-9 bg-background"
                  >
                    <SelectValue placeholder="Select an attribute..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAttributes.map((attribute) => (
                      <SelectItem
                        key={attribute.attribute_id}
                        value={String(attribute.attribute_id)}
                      >
                        {attribute.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newAttribute && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Value & Details
                    </Label>
                    <DataTypeBadge dataType={newAttribute.data_type} />
                  </div>
                  <ValueEditor
                    attribute={newAttribute}
                    value={newValue}
                    options={options[newAttribute.attribute_id] || []}
                    units={units}
                    optionsLoading={optionsLoading[newAttribute.attribute_id]}
                    onChange={setNewValue}
                  />
                </div>
              )}
            </div>

            {addError && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3.5" />
                <span>{addError}</span>
              </div>
            )}

            {newAttribute && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const validationError = validateValue(
                      newAttribute.data_type,
                      newValue,
                    );
                    if (validationError) {
                      setAddError(validationError);
                    } else {
                      void saveSpecification(newAttribute, newValue, false);
                    }
                  }}
                  disabled={!!isSaving[newAttribute.attribute_id]}
                  className="gap-1.5"
                >
                  {isSaving[newAttribute.attribute_id] ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Specification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Specifications Table Card */}
      <Card className="overflow-hidden border border-border shadow-xs">
        <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Configured Attributes
              </CardTitle>
              <CardDescription className="text-xs">
                {specifications.length}{" "}
                {specifications.length === 1 ? "attribute" : "attributes"}{" "}
                defined for this variant
              </CardDescription>
            </div>
            {specifications.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {availableAttributes.length} remaining
              </Badge>
            )}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[42%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="border-b border-border/50 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Attribute</th>
                <th className="px-4 py-3">Data Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <span className="mt-2 block text-xs">
                      Loading specifications...
                    </span>
                  </td>
                </tr>
              ) : specifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Layers className="mx-auto size-9 text-muted-foreground/40" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      No specifications defined
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add dimensions, materials, or features using the button
                      above.
                    </p>
                  </td>
                </tr>
              ) : (
                specifications.map((specification) => {
                  const attribute = attributeMap.get(
                    specification.attribute_id,
                  );
                  if (!attribute) return null;
                  const value =
                    values[attribute.attribute_id] || emptyFormValue;
                  const dirty = isRowDirty(attribute.attribute_id);
                  const saving = !!isSaving[attribute.attribute_id];

                  return (
                    <tr
                      key={attribute.attribute_id}
                      className="group transition-colors hover:bg-muted/15"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {attribute.name}
                          </span>
                          {dirty && (
                            <span className="mt-0.5 inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              Unsaved changes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <DataTypeBadge dataType={attribute.data_type} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1.5">
                          <ValueEditor
                            attribute={attribute}
                            value={value}
                            options={options[attribute.attribute_id] || []}
                            units={units}
                            optionsLoading={
                              optionsLoading[attribute.attribute_id]
                            }
                            onChange={(nextValue) =>
                              updateValue(attribute.attribute_id, nextValue)
                            }
                          />
                          {errors[attribute.attribute_id] && (
                            <p className="text-xs text-destructive">
                              {errors[attribute.attribute_id]}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {dirty && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                handleResetRow(attribute.attribute_id)
                              }
                              title="Revert changes"
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant={dirty ? "default" : "outline"}
                            size="icon"
                            className={`size-8 transition-all ${
                              dirty
                                ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                            onClick={() =>
                              void saveSpecification(attribute, value, true)
                            }
                            disabled={saving}
                            title="Save"
                          >
                            {saving ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(specification)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
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
      </Card>

      {/* Customer-Facing Preview Section */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Customer-Facing Preview
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Live preview of how specifications appear on product detail pages
            and customer invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-lg border border-border/60 bg-background/50 p-4">
            <VariantSpecificationTable
              specifications={specifications}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </div>
            <DialogTitle className="text-center text-lg">
              Remove Specification
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Are you sure you want to remove the{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              specification from this variant?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              className="flex-1"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function valueToSpecification(
  attribute: ItemAttribute,
  value: FormValue,
  options: AttributeOption[] = [],
  units: AttributeUnit[] = [],
): VariantSpecification {
  return {
    attribute_id: attribute.attribute_id,
    data_type: attribute.data_type,
    name: attribute.name,
    option_id: value.optionId ? Number(value.optionId) : null,
    option_value:
      options.find((option) => String(option.option_id) === value.optionId)
        ?.option_value || null,
    numeric_value: value.numericValue || null,
    unit_id: value.unitId ? Number(value.unitId) : null,
    unit: units.find((unit) => String(unit.unit_id) === value.unitId) || null,
    text_value: value.textValue || null,
  };
}
