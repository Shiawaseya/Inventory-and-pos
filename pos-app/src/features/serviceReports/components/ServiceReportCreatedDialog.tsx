import type { ReactNode } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceReport } from "../types/serviceReport";
import { formatDate } from "../utils/serviceReportFormat";
import { printServiceReport } from "../utils/serviceReportPrint";

type ServiceReportCreatedDialogProps = {
  report: ServiceReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ServiceReportCreatedDialog({
  report,
  open,
  onOpenChange,
}: ServiceReportCreatedDialogProps) {
  if (!report) return null;

  const brandModel = [report.unit?.brand, report.unit?.model]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </span>
          <DialogTitle className="text-lg">Service report created</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <p className="text-xs">Control number</p>
              <p className="font-mono text-base font-semibold text-foreground">
                {report.control_number}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y rounded-lg border">
          <Group title="Report">
            <Row label="Reported" value={formatDate(report.reported_date)} />
            <Row label="Prepared by" value={report.prepared_by?.name} />
            <Row label="Report to" value={report.report_to} />
            <Row label="Service center" value={report.asc_name} />
          </Group>
          <Group title="Customer">
            <Row label="Name" value={report.customer?.name} />
            <Row label="Contact" value={report.customer?.contact_number} />
            <Row label="Address" value={report.customer?.address} />
          </Group>
          <Group title="Unit and purchase">
            <Row
              label="Serial number"
              value={report.unit?.serial_number}
              mono
            />
            <Row label="Brand and model" value={brandModel} />
            <Row label="Invoice" value={report.invoice?.invoice_number} mono />
            <Row
              label="Purchased"
              value={formatDate(report.invoice?.date_of_purchase)}
            />
          </Group>
          <Group title="Complaint">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {report.complaint_description}
            </p>
          </Group>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Done
          </Button>
          <Button
            type="button"
            onClick={() => printServiceReport(report)}
            className="flex-1 gap-2"
          >
            <Printer className="size-4" />
            Print report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`break-words text-foreground ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
