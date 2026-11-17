import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canCertifyServiceReports } from "@/features/authentications/utils/access";
import { useAddServiceReportAction } from "../mutations/useAddServiceReportAction";
import { useCertifyServiceReport } from "../mutations/useCertifyServiceReport";
import { useServiceReportDetails } from "../queries/useServiceReportDetails";
import { useServiceReportsByBranch } from "../queries/useServiceReportsByBranch";
import type { ServiceReport } from "../types/serviceReport";
import {
  formatDate,
  formatDateTime,
  isValidDateString,
  todayLocal,
} from "../utils/serviceReportFormat";
import { printServiceReport } from "../utils/serviceReportPrint";
import { ServiceReportStatusBadge } from "./ServiceReportStatusBadge";

type ServiceReportHistoryProps = { branchId: string };
type StatusFilter = "all" | "pending" | "certified";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Awaiting" },
  { value: "certified", label: "Certified" },
];

export default function ServiceReportHistory({
  branchId,
}: ServiceReportHistoryProps) {
  const numericBranchId = Number(branchId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const historyQuery = useServiceReportsByBranch(
    Number.isInteger(numericBranchId) && numericBranchId > 0
      ? numericBranchId
      : null,
    page,
  );
  const detailQuery = useServiceReportDetails(selectedId);
  const reports = historyQuery.data?.items;

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (reports ?? []).filter((report) => {
      const certified = Boolean(report.certified_by);
      if (status === "pending" && certified) return false;
      if (status === "certified" && !certified) return false;
      if (!term) return true;
      return [
        report.control_number,
        report.customer?.name,
        report.complaint_description,
        report.unit?.serial_number,
        report.invoice?.invoice_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [reports, search, status]);

  const lastPage = historyQuery.data?.lastPage ?? 1;
  const isFiltering = Boolean(search.trim()) || status !== "all";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* List */}
      <section className="min-w-0 space-y-3" aria-label="Service reports">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search control number, customer, serial, invoice"
              aria-label="Search service reports"
              className="h-9 bg-background pl-9 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filter by status"
              className="inline-flex rounded-lg border bg-muted/40 p-0.5"
            >
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    status === value
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredReports.length}{" "}
              {filteredReports.length === 1 ? "report" : "reports"} on this page
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {historyQuery.isLoading && (
            <div className="flex flex-col items-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <p className="text-xs">Loading reports</p>
            </div>
          )}

          {historyQuery.error && (
            <div className="p-3">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  {historyQuery.error.message}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!historyQuery.isLoading &&
            !historyQuery.error &&
            filteredReports.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 p-10 text-center">
                <FileText className="size-7 stroke-1 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">
                  {isFiltering ? "No reports match" : "No service reports yet"}
                </p>
                <p className="max-w-56 text-xs text-muted-foreground">
                  {isFiltering
                    ? "Clear the search or change the status filter."
                    : "Reports filed for this branch will show up here."}
                </p>
              </div>
            )}

          {filteredReports.length > 0 && (
            <ul className="max-h-[600px] divide-y overflow-y-auto">
              {filteredReports.map((report) => (
                <li key={report.id}>
                  <ReportRow
                    report={report}
                    selected={selectedId === report.id}
                    onSelect={() => setSelectedId(report.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1 || historyQuery.isFetching}
              onClick={() => setPage((current) => current - 1)}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {historyQuery.data?.currentPage ?? page} of {lastPage}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= lastPage || historyQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
              className="h-8 gap-1 text-xs"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Detail */}
      <div className="min-w-0 xl:sticky xl:top-6">
        <ServiceReportDetail
          key={selectedId ?? "none"}
          report={selectedId ? detailQuery.data : undefined}
          isLoading={Boolean(selectedId) && detailQuery.isLoading}
          error={selectedId ? detailQuery.error : null}
        />
      </div>
    </div>
  );
}

function ReportRow({
  report,
  selected,
  onSelect,
}: {
  report: ServiceReport;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`block w-full space-y-1.5 border-l-2 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
        selected
          ? "border-l-primary bg-muted/60"
          : "border-l-transparent hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[13px] font-semibold text-foreground">
          {report.control_number}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(report.reported_date)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm text-foreground">
          {report.customer?.name || "No customer name"}
        </span>
        <ServiceReportStatusBadge
          certified={Boolean(report.certified_by)}
          className="shrink-0 px-1.5 py-0 text-[11px]"
        />
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {report.complaint_description}
      </p>

      {report.unit?.serial_number && (
        <p className="truncate font-mono text-[11px] text-muted-foreground/80">
          {report.unit.serial_number}
        </p>
      )}
    </button>
  );
}

type Notice = { text: string; tone: "ok" | "error" };

function ServiceReportDetail({
  report,
  isLoading,
  error,
}: {
  report: ServiceReport | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const certifyMutation = useCertifyServiceReport();
  const actionMutation = useAddServiceReportAction();
  const [actionDate, setActionDate] = useState(todayLocal);
  const [actionTaken, setActionTaken] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border bg-card text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading report</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="text-xs">{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <ClipboardList className="size-8 stroke-1 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">
          Select a report to review
        </p>
        <p className="max-w-64 text-xs text-muted-foreground">
          You'll see the complaint, unit details, and every service action
          logged so far.
        </p>
      </div>
    );
  }

  const isCertified = Boolean(report.certified_by);
  const brandModel = [report.unit?.brand, report.unit?.model]
    .filter(Boolean)
    .join(" ");

  const addAction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (!actionTaken.trim() || !isValidDateString(actionDate)) {
      setNotice({ text: "Enter a date and what was done.", tone: "error" });
      return;
    }
    actionMutation.mutate(
      {
        id: report.id,
        payload: { action_date: actionDate, action_taken: actionTaken.trim() },
      },
      {
        onSuccess: () => {
          setActionTaken("");
          setNotice({ text: "Action added.", tone: "ok" });
        },
        onError: (actionError) =>
          setNotice({ text: actionError.message, tone: "error" }),
      },
    );
  };

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-mono text-lg font-semibold text-foreground">
              {report.control_number}
            </h2>
            <ServiceReportStatusBadge certified={isCertified} />
          </div>
          <p className="text-sm text-muted-foreground">
            Reported {formatDate(report.reported_date)} by{" "}
            {report.prepared_by?.name || "staff"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printServiceReport(report)}
            className="gap-1.5"
          >
            <Printer className="size-3.5" />
            Print
          </Button>
          {canCertifyServiceReports() && !isCertified && (
            <Button
              type="button"
              size="sm"
              disabled={certifyMutation.isPending}
              onClick={() =>
                certifyMutation.mutate(report.id, {
                  onError: (certifyError) =>
                    setNotice({ text: certifyError.message, tone: "error" }),
                  onSuccess: () =>
                    setNotice({ text: "Report certified.", tone: "ok" }),
                })
              }
              className="gap-1.5"
            >
              {certifyMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
              Certify
            </Button>
          )}
        </div>
      </header>

      <div className="divide-y">
        {/* Complaint */}
        <section className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Complaint</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {report.complaint_description}
          </p>
        </section>

        {/* Facts */}
        <div className="grid gap-x-8 gap-y-6 p-5 md:grid-cols-2">
          <InfoGroup title="Customer">
            <Info label="Name" value={report.customer?.name} />
            <Info
              label="Contact number"
              value={report.customer?.contact_number}
            />
            <Info label="Address" value={report.customer?.address} />
          </InfoGroup>

          <InfoGroup title="Unit">
            <Info
              label="Serial number"
              value={report.unit?.serial_number}
              mono
            />
            <Info label="Brand and model" value={brandModel} />
          </InfoGroup>

          <InfoGroup title="Purchase">
            <Info
              label="Invoice number"
              value={report.invoice?.invoice_number}
              mono
            />
            <Info
              label="Date of purchase"
              value={formatDate(report.invoice?.date_of_purchase)}
            />
          </InfoGroup>

          <InfoGroup title="Routing">
            <Info label="Report to" value={report.report_to} />
            <Info label="Service center" value={report.asc_name} />
          </InfoGroup>
        </div>

        {/* Certification */}
        <section className="p-5">
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              isCertified
                ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                : "bg-muted/30"
            }`}
          >
            <p className="font-medium text-foreground">
              {isCertified
                ? `Certified by ${report.certified_by?.name}`
                : "Not yet certified"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isCertified
                ? formatDateTime(report.certified_at)
                : "The sales OIC or a supervisor must certify this report before the warranty claim can be filed."}
            </p>
          </div>
        </section>

        {/* Activity */}
        <section className="space-y-4 p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Service activity
            </h3>
            <span className="text-xs text-muted-foreground">
              {report.actions?.length || 0}{" "}
              {report.actions?.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {report.actions?.length ? (
            <ol className="ml-1 space-y-4 border-l">
              {report.actions.map((action) => (
                <li key={action.id} className="relative pl-5">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 size-2 -translate-x-1/2 rounded-full bg-primary ring-4 ring-card"
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatDate(action.action_date)}
                    </span>{" "}
                    logged by {action.logged_by}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {action.action_taken}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Nothing logged yet. Add the first update below, such as when the
              unit was sent to the service center.
            </p>
          )}

          <form
            onSubmit={addAction}
            className="space-y-3 rounded-lg border bg-muted/30 p-4"
          >
            <h4 className="text-sm font-medium text-foreground">
              Log an update
            </h4>
            <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
              <div className="space-y-1">
                <Label
                  htmlFor="actionDate"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Date
                </Label>
                <Input
                  id="actionDate"
                  type="date"
                  value={actionDate}
                  onChange={(event) => setActionDate(event.target.value)}
                  className="h-9 bg-background text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="actionTaken"
                  className="text-xs font-normal text-muted-foreground"
                >
                  What was done
                </Label>
                <Input
                  id="actionTaken"
                  value={actionTaken}
                  onChange={(event) => setActionTaken(event.target.value)}
                  placeholder="Unit sent to the service center"
                  className="h-9 bg-background text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p
                role="status"
                className={`text-xs ${
                  notice?.tone === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {notice?.text}
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={actionMutation.isPending || !actionTaken.trim()}
                className="gap-1.5"
              >
                {actionMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Add update
              </Button>
            </div>
          </form>
        </section>
      </div>
    </article>
  );
}

function InfoGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
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
          <span className="text-muted-foreground/60">Not provided</span>
        )}
      </dd>
    </div>
  );
}
