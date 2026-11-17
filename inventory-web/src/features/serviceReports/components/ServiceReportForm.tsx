import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  FilePlus2,
  Loader2,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CreateServiceReportRequest,
  ServiceReport,
  ServiceReportLookup as ServiceReportLookupResult,
} from "../types/serviceReport";
import { useServiceReportLookup } from "../hooks/useServiceReportLookup";
import { useCreateServiceReport } from "../mutations/useCreateServiceReport";
import {
  formatDate,
  isValidDateString,
  todayLocal,
} from "../utils/serviceReportFormat";
import { LookupVerificationCard } from "./LookupVerificationCard";
import { ServiceReportCreatedDialog } from "./ServiceReportCreatedDialog";
import { ServiceReportLookup } from "./ServiceReportLookup";

type ServiceReportFormProps = {
  user: { name: string; branchId: string } | null;
};

/* ---------- address helpers ---------- */

type AddressFields = {
  street_address: string;
  barangay: string;
  city_municipality: string;
  province: string;
  postal_code: string;
};

const emptyAddress: AddressFields = {
  street_address: "",
  barangay: "",
  city_municipality: "",
  province: "",
  postal_code: "",
};

const addressKeys = Object.keys(emptyAddress) as (keyof AddressFields)[];

const toAddressFields = (
  details?: Partial<Record<keyof AddressFields, string | null>> | null,
): AddressFields => ({
  street_address: details?.street_address ?? "",
  barangay: details?.barangay ?? "",
  city_municipality: details?.city_municipality ?? "",
  province: details?.province ?? "",
  postal_code: details?.postal_code ?? "",
});

const trimAddress = (fields: AddressFields): AddressFields =>
  toAddressFields(
    Object.fromEntries(addressKeys.map((key) => [key, fields[key].trim()])),
  );

const isAddressEmpty = (fields: AddressFields) =>
  addressKeys.every((key) => !fields[key].trim());

/* ---------- where a value came from ---------- */

type Source = "record" | "edited" | "added" | "missing";

const sourceOf = (original: string, current: string): Source => {
  const before = original.trim();
  const after = current.trim();
  if (!before) return after ? "added" : "missing";
  return before === after ? "record" : "edited";
};

const addressSourceOf = (
  original: AddressFields,
  current: AddressFields,
): Source => {
  if (isAddressEmpty(original)) {
    return isAddressEmpty(current) ? "missing" : "added";
  }
  const same = addressKeys.every(
    (key) => original[key].trim() === current[key].trim(),
  );
  return same ? "record" : "edited";
};

const SOURCE_TEXT: Record<Source, string> = {
  record: "From the customer record.",
  edited: "Changed for this report only. The customer record isn't updated.",
  added: "Added for this report only. The customer record isn't updated.",
  missing: "None on file. Enter one to continue.",
};

function SourceHint({ source }: { source: Source }) {
  return (
    <p
      className={`text-xs ${
        source === "missing"
          ? "text-amber-700 dark:text-amber-400"
          : "text-muted-foreground"
      }`}
    >
      {SOURCE_TEXT[source]}
    </p>
  );
}

/* ---------- layout pieces ---------- */

function Step({
  index,
  title,
  description,
  done,
  isLast = false,
  children,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="relative flex gap-4">
      {!isLast && (
        <span
          aria-hidden
          className="absolute bottom-[-2.25rem] left-3.5 top-9 w-px -translate-x-1/2 bg-border"
        />
      )}
      <span
        aria-hidden
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
          done
            ? "bg-primary text-primary-foreground"
            : "border bg-background text-muted-foreground"
        }`}
      >
        {done ? <Check className="size-3.5" /> : index}
      </span>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-0.5 pt-0.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

const fieldClass = "h-9 bg-background text-sm";

/* ---------- form ---------- */

export default function ServiceReportForm({ user }: ServiceReportFormProps) {
  const lookupMutation = useServiceReportLookup();
  const createMutation = useCreateServiceReport();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ServiceReportLookupResult | null>(
    null,
  );
  const [contactNumber, setContactNumber] = useState("");
  const [addressFields, setAddressFields] =
    useState<AddressFields>(emptyAddress);
  const [reportedDate, setReportedDate] = useState(todayLocal);
  const [complaint, setComplaint] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [ascName, setAscName] = useState("");
  const [manualControl, setManualControl] = useState(false);
  const [controlNumber, setControlNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<ServiceReport | null>(
    null,
  );
  const [isCreatedDialogOpen, setIsCreatedDialogOpen] = useState(false);

  const resetContactFields = () => {
    setContactNumber("");
    setAddressFields(emptyAddress);
  };

  const resetForm = () => {
    setSearch("");
    setSelected(null);
    resetContactFields();
    setReportedDate(todayLocal());
    setComplaint("");
    setReportTo("");
    setAscName("");
    setManualControl(false);
    setControlNumber("");
    setFormError(null);
    lookupMutation.reset();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSelected(null);
    resetContactFields();
    lookupMutation.reset();
  };

  const handleSearch = () => {
    if (!search.trim()) return;
    setSelected(null);
    resetContactFields();
    lookupMutation.mutate(search.trim(), {
      onSuccess: (result) => {
        setSelected(result);
        // Prefill from the customer record. Staff can edit, or fill in what's missing.
        setContactNumber(result.customer?.contact_number ?? "");
        setAddressFields(toAddressFields(result.customer?.address_details));
      },
    });
  };

  const changeUnit = () => {
    setSelected(null);
    resetContactFields();
    lookupMutation.reset();
  };

  const clearSearch = () => {
    setSearch("");
    changeUnit();
  };

  /* what the customer record already holds */
  const originalContact = selected?.customer?.contact_number ?? "";
  const originalAddress = toAddressFields(selected?.customer?.address_details);
  const contactSource = sourceOf(originalContact, contactNumber);
  const addressSource = addressSourceOf(originalAddress, addressFields);

  /* readiness */
  const hasContact = Boolean(contactNumber.trim());
  const hasAddress = !isAddressEmpty(addressFields);
  const hasComplaint = Boolean(complaint.trim());
  const hasValidDate = isValidDateString(reportedDate);
  const controlOk = !manualControl || Boolean(controlNumber.trim());
  const ready =
    Boolean(selected) &&
    hasContact &&
    hasAddress &&
    hasComplaint &&
    hasValidDate &&
    controlOk;

  const checklist = [
    { label: "Unit verified", done: Boolean(selected) },
    { label: "Contact number", done: hasContact },
    { label: "Address", done: hasAddress },
    { label: "Complaint", done: hasComplaint },
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const branchId = Number(user?.branchId);
    if (!selected?.stock_unit_id || !selected.sales_invoice_id) {
      setFormError("Verify a unit and invoice before creating the report.");
      return;
    }
    if (!Number.isInteger(branchId) || branchId < 1) {
      setFormError("Your account has no branch assigned.");
      return;
    }
    if (!hasContact || !hasAddress) {
      setFormError("Add a contact number and address for the customer.");
      return;
    }
    if (!hasComplaint) {
      setFormError("Describe the customer's complaint.");
      return;
    }
    if (!hasValidDate) {
      setFormError("Enter a valid reported date.");
      return;
    }

    // Reuse the customer's addresses row when untouched; otherwise save a new one.
    const trimmedAddress = trimAddress(addressFields);
    const customerAddressId = selected.customer?.address_id ?? null;
    const addressUnchanged =
      !!customerAddressId &&
      addressKeys.every(
        (key) => originalAddress[key].trim() === trimmedAddress[key],
      );

    const payload: CreateServiceReportRequest = {
      branch_id: branchId,
      stock_unit_id: selected.stock_unit_id,
      sales_invoice_id: selected.sales_invoice_id,
      reported_date: reportedDate,
      complaint_description: complaint.trim(),
      contact_number: contactNumber.trim(),
      ...(addressUnchanged
        ? { address_id: customerAddressId }
        : { address: trimmedAddress }),
      ...(reportTo.trim() ? { report_to: reportTo.trim() } : {}),
      ...(ascName.trim() ? { asc_name: ascName.trim() } : {}),
      ...(manualControl && controlNumber.trim()
        ? { control_number: controlNumber.trim() }
        : {}),
    };

    createMutation.mutate(payload, {
      onSuccess: (report) => {
        setCreatedReport(report);
        setIsCreatedDialogOpen(true);
        resetForm(); // so the same complaint can't be filed twice by accident
      },
      onError: (error) => setFormError(error.message),
    });
  };

  const isSaving = createMutation.isPending;
  const lockedClass = !selected ? "pointer-events-none opacity-50" : "";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        id="service-report-form"
        onSubmit={handleSubmit}
        className="min-w-0 space-y-9"
        noValidate
      >
        {/* 1 ─ Find the unit */}
        <Step
          index={1}
          title="Find the unit"
          description="Look up the serialized unit the customer bought."
          done={Boolean(selected)}
        >
          {selected ? (
            <LookupVerificationCard result={selected} onChange={clearSearch} />
          ) : (
            <ServiceReportLookup
              value={search}
              isLoading={lookupMutation.isPending}
              error={lookupMutation.error}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              onClear={clearSearch}
            />
          )}
        </Step>

        {/* 2 ─ Customer contact */}
        <Step
          index={2}
          title="Customer contact"
          description="Where the service center can reach the customer for this claim."
          done={Boolean(selected) && hasContact && hasAddress}
        >
          <fieldset
            disabled={!selected || isSaving}
            aria-label="Customer contact"
            className={`space-y-5 ${lockedClass}`}
          >
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="contactNumber" className="text-sm font-medium">
                Contact number
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contactNumber"
                  type="tel"
                  inputMode="tel"
                  value={contactNumber}
                  onChange={(event) => setContactNumber(event.target.value)}
                  maxLength={50}
                  placeholder="09171234567"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {selected && <SourceHint source={contactSource} />}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="size-3.5 text-muted-foreground" />
                Address
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["street_address", "Street or house number", true],
                    ["barangay", "Barangay", false],
                    ["city_municipality", "City or municipality", false],
                    ["province", "Province", false],
                    ["postal_code", "Postal code", false],
                  ] as const
                ).map(([key, label, wide]) => (
                  <div
                    key={key}
                    className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}
                  >
                    <Label
                      htmlFor={`address-${key}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {label}
                    </Label>
                    <Input
                      id={`address-${key}`}
                      value={addressFields[key]}
                      onChange={(event) =>
                        setAddressFields((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }))
                      }
                      maxLength={key === "postal_code" ? 10 : 255}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
              {selected && <SourceHint source={addressSource} />}
            </div>
          </fieldset>
        </Step>

        {/* 3 ─ Complaint */}
        <Step
          index={3}
          title="Complaint"
          description="What's wrong with the unit, and where it's being sent."
          done={Boolean(selected) && hasComplaint}
          isLast
        >
          <fieldset
            disabled={!selected || isSaving}
            aria-label="Complaint details"
            className={`space-y-5 ${lockedClass}`}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="complaintDescription"
                className="text-sm font-medium"
              >
                What did the customer report?
              </Label>
              <textarea
                id="complaintDescription"
                value={complaint}
                onChange={(event) => setComplaint(event.target.value)}
                rows={4}
                placeholder="Symptoms, error codes, visible damage, when it started"
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="reportedDate" className="text-sm font-medium">
                  Date reported
                </Label>
                <Input
                  id="reportedDate"
                  type="date"
                  value={reportedDate}
                  onChange={(event) => setReportedDate(event.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reportTo" className="text-sm font-medium">
                  Report to <Optional />
                </Label>
                <Input
                  id="reportTo"
                  list="report-to-options"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                  maxLength={150}
                  placeholder="Authorized Service Center"
                  className={fieldClass}
                />
                <datalist id="report-to-options">
                  <option value="Authorized Service Center" />
                  <option value="Head Office Warranty Dept" />
                  <option value="Supplier Claim Dept" />
                  <option value="Branch Replacement" />
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ascName" className="text-sm font-medium">
                  Service center <Optional />
                </Label>
                <Input
                  id="ascName"
                  list="asc-options"
                  value={ascName}
                  onChange={(event) => setAscName(event.target.value)}
                  maxLength={150}
                  placeholder="Panasonic Service Desk"
                  className={fieldClass}
                />
                <datalist id="asc-options">
                  <option value="Fujidenzo ASC" />
                  <option value="Panasonic Service Desk" />
                  <option value="Samsung Service Center" />
                  <option value="LG Service Center" />
                  <option value="Sharp Service Center" />
                </datalist>
              </div>
            </div>
          </fieldset>
        </Step>
      </form>

      {/* Summary + submit */}
      <aside className="lg:sticky lg:top-6">
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Report summary
            </h2>
          </div>

          <dl className="space-y-3.5 p-4 text-sm">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Control number</dt>
              <dd>
                {manualControl ? (
                  <Input
                    aria-label="Control number"
                    value={controlNumber}
                    onChange={(event) => setControlNumber(event.target.value)}
                    maxLength={50}
                    placeholder="SR-20261029-A1B2C3"
                    disabled={isSaving}
                    className="h-8 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono text-[13px] text-foreground">
                    Assigned when saved
                  </span>
                )}
              </dd>
              <button
                type="button"
                onClick={() => {
                  setManualControl((value) => !value);
                  setControlNumber("");
                }}
                disabled={isSaving}
                className="text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {manualControl ? "Use automatic number" : "Enter one manually"}
              </button>
            </div>

            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Prepared by</dt>
              <dd className="flex items-center gap-1.5 text-foreground">
                <User className="size-3.5 text-muted-foreground" />
                {user?.name || "Authenticated staff"}
              </dd>
            </div>

            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Date reported</dt>
              <dd className="text-foreground">
                {formatDate(reportedDate) || "Not set"}
              </dd>
            </div>
          </dl>

          <ul className="space-y-2 border-t p-4 text-sm" aria-label="Checklist">
            {checklist.map(({ label, done }) => (
              <li
                key={label}
                className={`flex items-center gap-2.5 ${
                  done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : "border border-dashed border-muted-foreground/50"
                  }`}
                >
                  {done && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                {label}
                <span className="sr-only">
                  {done ? "done" : "still needed"}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t p-4">
            {formError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">
                  {formError}
                </AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              form="service-report-form"
              disabled={!ready || isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving report
                </>
              ) : (
                <>
                  <FilePlus2 className="size-4" />
                  Create service report
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      <ServiceReportCreatedDialog
        report={createdReport}
        open={isCreatedDialogOpen}
        onOpenChange={setIsCreatedDialogOpen}
      />
    </div>
  );
}
