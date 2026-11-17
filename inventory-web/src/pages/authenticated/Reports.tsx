import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import getDailySalesReport from "@/features/reports/api/getDailySalesReport";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  PhilippinePeso,
  ShoppingBag,
  CreditCard,
  User,
  Calendar,
  Building2,
} from "lucide-react";

export interface DailySalesResponse {
  success: boolean;
  data: {
    date: string;
    branch_id: number;
    employee_id: number | null;
    total_revenue: number;
    invoice_count: number;
    total_items_sold: number;
    by_item: {
      item_id: number;
      name: string;
      variant_id: number;
      variant_model: string;
      qty_sold: number;
      revenue: number;
    }[];
    by_payment_method: Record<
      string,
      {
        invoices: number;
        revenue: number;
      }
    >;
    invoices: {
      sales_invoice_id: number;
      sales_invoice_number: string;
      date_of_purchase: string;
      total_amount: number;
      payment_method: string;
      employee_id: number;
      salesperson: string;
    }[];
  };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

const formatPaymentMethod = (method: string) =>
  method
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getToday = () => new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const [date, setDate] = useState(getToday);
  const [response, setResponse] = useState<DailySalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (selectedDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getDailySalesReport(selectedDate);
      setResponse({ success: true, data });
    } catch (requestError: unknown) {
      setResponse(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the daily sales report",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport(date);
    // Load the report for the initial date only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    if (!response) return;

    // The browser uses the page title as the default PDF file name.
    const previousTitle = document.title;
    document.title = `Sales-Report-${response.data.date}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales Report</h1>
          <p className="text-sm text-muted-foreground">
            View sales activity for a selected date.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            />
          </label>
          <button
            type="button"
            onClick={() => void fetchReport(date)}
            disabled={loading || !date}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Loading..." : "Fetch report"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !response}
            className="h-9 rounded-md border bg-background px-4 text-sm font-medium disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {response && <DailySalesSummary response={response} />}

      {/* Print-only document. Hidden on screen, it replaces the page when printing. */}
      {response && <PrintableSalesReport response={response} />}
    </div>
  );
}

export function DailySalesSummary({
  response,
}: {
  response: DailySalesResponse;
}) {
  const { data } = response;
  const paymentEntries = Object.entries(data.by_payment_method);

  return (
    <Card className="w-full border-none shadow-none bg-transparent overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b bg-background/50 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">
                Daily Sales Summary
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {data.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Branch #{data.branch_id}
                </span>
              </CardDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className="w-fit text-xs font-medium px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          >
            {data.employee_id
              ? `Employee #${data.employee_id}`
              : "All Branch Sales"}
          </Badge>
        </div>
      </CardHeader>

      {/* Top KPI Cards */}
      <div className="border-b bg-background/50 px-6 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {formatCurrency(data.total_revenue)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <PhilippinePeso className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-lg border bg-background px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Invoices Issued
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {data.invoice_count}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-lg border bg-background px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Items Sold
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {data.total_items_sold}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Breakdown Grid: Items Sold + Payment Methods */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sales by Item (2/3 width on desktop) */}
          <div className="lg:col-span-2 rounded-lg border bg-background overflow-hidden">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Sales by Item</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Product</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_item.length > 0 ? (
                  data.by_item.map((item) => (
                    <TableRow key={item.variant_id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {item.variant_model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.qty_sold}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground italic"
                    >
                      No items sold on this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Payment Methods Breakdown (1/3 width on desktop) */}
          <div className="rounded-lg border bg-background overflow-hidden flex flex-col">
            <div className="border-b px-4 py-3 bg-muted/30 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">By Payment Method</h3>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {paymentEntries.length > 0 ? (
                paymentEntries.map(([method, stats]) => {
                  const share =
                    data.total_revenue > 0
                      ? Math.round((stats.revenue / data.total_revenue) * 100)
                      : 0;

                  return (
                    <div
                      key={method}
                      className="rounded-lg border p-3 space-y-2 bg-muted/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatPaymentMethod(method)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {stats.invoices}{" "}
                          {stats.invoices === 1 ? "invoice" : "invoices"}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold tabular-nums text-foreground">
                          {formatCurrency(stats.revenue)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {share}% of total
                        </span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  No payment records.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="rounded-lg border bg-background overflow-hidden">
          <div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Invoices</h3>
            <span className="text-xs text-muted-foreground">
              {data.invoices.length} record
              {data.invoices.length === 1 ? "" : "s"}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.length > 0 ? (
                data.invoices.map((inv) => (
                  <TableRow key={inv.sales_invoice_id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {inv.sales_invoice_number}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.date_of_purchase}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{inv.salesperson}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {formatPaymentMethod(inv.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-sm text-muted-foreground italic"
                  >
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Print layout                                                              */
/* -------------------------------------------------------------------------- */

/** Shown at the top of the printed report. Leave empty to hide it. */
const PRINT_COMPANY_NAME = "";

const parseDate = (value: string) => {
  // "2026-11-14 10:30:00" is not valid ISO for every browser; make it so.
  const parsed = new Date(
    value.includes(" ") ? value.replace(" ", "T") : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** "Saturday, November 14, 2026" */
const formatLongDate = (value: string) => {
  const parsed = parseDate(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  return parsed
    ? parsed.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : value;
};

/** "Nov 14, 2026, 10:30 AM" (date only if the value has no time). */
const formatInvoiceDate = (value: string) => {
  const parsed = parseDate(value);
  if (!parsed) return value;
  const hasTime = /\d{1,2}:\d{2}/.test(value);
  return parsed.toLocaleString("en-PH", {
    dateStyle: "medium",
    ...(hasTime ? { timeStyle: "short" } : {}),
  });
};

const formatPrintedAt = () =>
  new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });

const PRINT_CSS = `
@page {
  size: A4;
  margin: 14mm 12mm 18mm;
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font: 8pt "Segoe UI", Arial, sans-serif;
    color: #555;
  }
}

@media screen {
  #sales-report-print { display: none; }
}

@media print {
  /* Print only the report, not the app (sidebar, buttons, on-screen cards). */
  body > *:not(#sales-report-print) { display: none !important; }
  html, body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }

  #sales-report-print {
    display: block;
    color: #111;
    background: #fff;
    font: 10pt/1.4 "Segoe UI", Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #sales-report-print * { box-sizing: border-box; }

  .rp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16pt;
    padding-bottom: 8pt;
    border-bottom: 2pt solid #111;
    margin-bottom: 12pt;
  }
  .rp-company { margin: 0 0 2pt; font-size: 10pt; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #444; }
  .rp-title { margin: 0; font-size: 20pt; font-weight: 700; line-height: 1.1; }
  .rp-date { margin: 3pt 0 0; font-size: 11pt; color: #333; }
  .rp-meta { margin: 0; font-size: 9pt; }
  .rp-meta div { display: flex; gap: 6pt; justify-content: flex-end; }
  .rp-meta dt { color: #555; }
  .rp-meta dd { margin: 0; font-weight: 600; }

  .rp-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1pt solid #999;
    margin-bottom: 14pt;
    break-inside: avoid;
  }
  .rp-summary > div { padding: 8pt 10pt; border-left: 1pt solid #999; }
  .rp-summary > div:first-child { border-left: 0; background: #f2f2f2; }
  .rp-summary .rp-label { margin: 0; font-size: 7.5pt; letter-spacing: .06em; text-transform: uppercase; color: #555; }
  .rp-summary .rp-value { margin: 2pt 0 0; font-size: 15pt; font-weight: 700; font-variant-numeric: tabular-nums; }

  .rp-section { margin-bottom: 14pt; }
  .rp-section h2 {
    margin: 0 0 4pt;
    font-size: 11pt;
    font-weight: 700;
    break-after: avoid;
  }
  .rp-section h2 small { font-size: 8.5pt; font-weight: 400; color: #555; margin-left: 6pt; }

  .rp-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .rp-table thead { display: table-header-group; }   /* repeat on every page */
  .rp-table th {
    padding: 4pt 6pt;
    text-align: left;
    font-size: 8pt;
    letter-spacing: .04em;
    text-transform: uppercase;
    background: #e8e8e8;
    border-top: 1pt solid #111;
    border-bottom: 1pt solid #111;
  }
  .rp-table td { padding: 4pt 6pt; border-bottom: .5pt solid #bbb; vertical-align: top; }
  .rp-table tr { break-inside: avoid; }
  .rp-table .rp-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rp-table .rp-mono { font-family: Consolas, "Courier New", monospace; font-size: 8.5pt; }
  .rp-table .rp-total td {
    font-weight: 700;
    background: #f2f2f2;
    border-top: 1pt solid #111;
    border-bottom: 1pt solid #111;
  }
  .rp-table .rp-empty { padding: 10pt; text-align: center; font-style: italic; color: #555; }

  .rp-signatures {
    display: flex;
    gap: 40pt;
    margin-top: 28pt;
    break-inside: avoid;
  }
  .rp-signatures > div { flex: 1; padding-top: 4pt; border-top: 1pt solid #111; font-size: 8.5pt; color: #444; }

  .rp-footer {
    position: fixed;
    left: 0; right: 0; bottom: -12mm;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #555;
  }
}
`;

/**
 * A proper report for printing: header, summary, tables with totals, signature lines and a
 * footer on every page. It is rendered straight into <body> so the app layout (sidebar,
 * scroll containers) can never clip it or squeeze it onto one page.
 */
export function PrintableSalesReport({
  response,
}: {
  response: DailySalesResponse;
}) {
  const { data } = response;
  const printedAtRef = useRef<HTMLSpanElement>(null);

  // Stamp the real print time (not the time the report was loaded).
  useEffect(() => {
    const stamp = () => {
      if (printedAtRef.current)
        printedAtRef.current.textContent = formatPrintedAt();
    };
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, []);

  if (typeof document === "undefined") return null;

  const paymentEntries = Object.entries(data.by_payment_method);
  const totalQty = data.by_item.reduce((sum, item) => sum + item.qty_sold, 0);
  const totalItemRevenue = data.by_item.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const totalInvoiceAmount = data.invoices.reduce(
    (sum, inv) => sum + inv.total_amount,
    0,
  );
  const longDate = formatLongDate(data.date);

  return createPortal(
    <div id="sales-report-print" aria-hidden="true">
      <style>{PRINT_CSS}</style>

      <header className="rp-header">
        <div>
          {PRINT_COMPANY_NAME && (
            <p className="rp-company">{PRINT_COMPANY_NAME}</p>
          )}
          <h1 className="rp-title">Daily Sales Report</h1>
          <p className="rp-date">{longDate}</p>
        </div>
        <dl className="rp-meta">
          <div>
            <dt>Branch:</dt>
            <dd>#{data.branch_id}</dd>
          </div>
          <div>
            <dt>Covers:</dt>
            <dd>
              {data.employee_id
                ? `Sales by employee #${data.employee_id}`
                : "All sales in this branch"}
            </dd>
          </div>
        </dl>
      </header>

      <section className="rp-summary">
        <div>
          <p className="rp-label">Total revenue</p>
          <p className="rp-value">{formatCurrency(data.total_revenue)}</p>
        </div>
        <div>
          <p className="rp-label">Invoices issued</p>
          <p className="rp-value">{data.invoice_count}</p>
        </div>
        <div>
          <p className="rp-label">Items sold</p>
          <p className="rp-value">{data.total_items_sold}</p>
        </div>
      </section>

      <section className="rp-section">
        <h2>Sales by item</h2>
        <table className="rp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Model</th>
              <th className="rp-num">Qty</th>
              <th className="rp-num">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.by_item.length > 0 ? (
              <>
                {data.by_item.map((item) => (
                  <tr key={item.variant_id}>
                    <td>{item.name}</td>
                    <td className="rp-mono">{item.variant_model}</td>
                    <td className="rp-num">{item.qty_sold}</td>
                    <td className="rp-num">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
                <tr className="rp-total">
                  <td colSpan={2}>Total</td>
                  <td className="rp-num">{totalQty}</td>
                  <td className="rp-num">{formatCurrency(totalItemRevenue)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={4} className="rp-empty">
                  No items sold on this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rp-section">
        <h2>Sales by payment method</h2>
        <table className="rp-table">
          <thead>
            <tr>
              <th>Payment method</th>
              <th className="rp-num">Invoices</th>
              <th className="rp-num">Revenue</th>
              <th className="rp-num">Share of total</th>
            </tr>
          </thead>
          <tbody>
            {paymentEntries.length > 0 ? (
              <>
                {paymentEntries.map(([method, stats]) => (
                  <tr key={method}>
                    <td>{formatPaymentMethod(method)}</td>
                    <td className="rp-num">{stats.invoices}</td>
                    <td className="rp-num">{formatCurrency(stats.revenue)}</td>
                    <td className="rp-num">
                      {data.total_revenue > 0
                        ? `${Math.round((stats.revenue / data.total_revenue) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="rp-total">
                  <td>Total</td>
                  <td className="rp-num">
                    {paymentEntries.reduce(
                      (sum, [, stats]) => sum + stats.invoices,
                      0,
                    )}
                  </td>
                  <td className="rp-num">
                    {formatCurrency(data.total_revenue)}
                  </td>
                  <td className="rp-num">
                    {data.total_revenue > 0 ? "100%" : "—"}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={4} className="rp-empty">
                  No payment records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rp-section">
        <h2>
          Invoices
          <small>
            {data.invoices.length} record{data.invoices.length === 1 ? "" : "s"}
          </small>
        </h2>
        <table className="rp-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Salesperson</th>
              <th>Payment method</th>
              <th className="rp-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.length > 0 ? (
              <>
                {data.invoices.map((inv) => (
                  <tr key={inv.sales_invoice_id}>
                    <td className="rp-mono">{inv.sales_invoice_number}</td>
                    <td>{formatInvoiceDate(inv.date_of_purchase)}</td>
                    <td>{inv.salesperson}</td>
                    <td>{formatPaymentMethod(inv.payment_method)}</td>
                    <td className="rp-num">
                      {formatCurrency(inv.total_amount)}
                    </td>
                  </tr>
                ))}
                <tr className="rp-total">
                  <td colSpan={4}>Total</td>
                  <td className="rp-num">
                    {formatCurrency(totalInvoiceAmount)}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={5} className="rp-empty">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="rp-signatures">
        <div>Prepared by (name &amp; signature)</div>
        <div>Checked by (name &amp; signature)</div>
      </div>

      <footer className="rp-footer">
        <span>Daily Sales Report &middot; {longDate}</span>
        <span>
          Printed on <span ref={printedAtRef}>{formatPrintedAt()}</span>
        </span>
      </footer>
    </div>,
    document.body,
  );
}
