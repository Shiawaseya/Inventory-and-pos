import type { ReactNode } from "react";
import {
  CheckCircle2,
  Package,
  Receipt,
  RotateCcw,
  ShieldAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceReportLookup } from "../types/serviceReport";
import { formatDate } from "../utils/serviceReportFormat";

type LookupVerificationCardProps = {
  result: ServiceReportLookup;
  onChange: () => void;
};

export function LookupVerificationCard({
  result,
  onChange,
}: LookupVerificationCardProps) {
  const brandModel = [result.brand, result.model].filter(Boolean).join(" ");

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Purchase verified
            </p>
            <p className="text-xs text-muted-foreground">
              Matched to a sold unit and its sales invoice.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onChange}
          className="gap-1.5 text-xs"
        >
          <RotateCcw className="size-3.5" />
          Change unit
        </Button>
      </div>

      <div className="grid border-t md:grid-cols-3 md:divide-x max-md:divide-y">
        <Column icon={<Package className="size-4" />} title="Unit">
          <Field label="Serial number" value={result.serial_number} mono />
          <Field label="Brand and model" value={brandModel} />
        </Column>

        <Column icon={<Receipt className="size-4" />} title="Purchase">
          <Field label="Invoice number" value={result.invoice_number} mono />
          <Field
            label="Date of purchase"
            value={formatDate(result.date_of_purchase)}
          />
        </Column>

        <Column icon={<User className="size-4" />} title="Customer on record">
          <Field label="Name" value={result.customer?.name} />
          <Field
            label="Contact number"
            value={result.customer?.contact_number}
            missing="None on file"
          />
          <Field
            label="Address"
            value={result.customer?.address}
            missing="None on file"
          />
        </Column>
      </div>

      <div className="flex items-start gap-2.5 border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <ShieldAlert className="mt-px size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p>
          Warranty isn't recorded digitally. Check the official receipt or
          warranty card before filing.
        </p>
      </div>
    </div>
  );
}

function Column({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
  missing = "Not provided",
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  missing?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 break-words text-sm text-foreground ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {value || (
          <span className="text-amber-700 dark:text-amber-400">{missing}</span>
        )}
      </dd>
    </div>
  );
}
