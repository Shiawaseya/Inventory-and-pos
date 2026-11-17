import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { loginApi } from "@/features/authentications/api/loginApi";
import { type SalesInvoice } from "@/types/sales-invoice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

/**
 * The invoice list may or may not include the financing record, depending on
 * what the sales-invoices endpoint returns. Read it defensively.
 */
type FinancingLike = {
  financed_amount?: number | string | null;
  loan_account_number?: string | null;
  provider?: string | null;
  status?: string | null;
};

type InvoiceWithFinancing = SalesInvoice & { financing?: FinancingLike | null };

interface SettleInvoiceDialogProps {
  invoice: SalesInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function SettleInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSettled,
}: SettleInvoiceDialogProps) {
  const [amount, setAmount] = useState("");
  const [driverName, setDriverName] = useState("");
  const [conformeReceived, setConformeReceived] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const financing = invoice
    ? ((invoice as InvoiceWithFinancing).financing ?? null)
    : null;
  const financedAmount =
    financing?.financed_amount != null ? Number(financing.financed_amount) : 0;
  const isFinanced = financedAmount > 0 && financing?.status !== "cancelled";
  // For a financed sale the branch is owed the financed amount, otherwise the invoice total.
  const amountDue = isFinanced ? financedAmount : Number(invoice?.total_amount ?? 0);

  useEffect(() => {
    if (invoice) {
      setAmount(amountDue > 0 ? amountDue.toFixed(2) : "");
      setDriverName("");
      setConformeReceived(false);
      setRemarks("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const variance = amountValid ? Math.round((parsedAmount - amountDue) * 100) / 100 : 0;

  const handleSubmit = async () => {
    if (!invoice || !amountValid) return;

    setSubmitting(true);
    const token = loginApi.getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/sales/${invoice.id}/settle`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          amount_remitted: parsedAmount,
          driver_name: driverName.trim() || undefined,
          conforme_received: conformeReceived,
          remarks: remarks.trim() || undefined,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Failed to settle invoice");
      }

      const serverVariance = Number(body?.data?.variance ?? 0);
      if (serverVariance !== 0) {
        toast.warning(
          `Invoice ${invoice.sales_invoice_number} settled with a ${
            serverVariance < 0 ? "shortage" : "overage"
          } of ${formatPeso(Math.abs(serverVariance))}`,
        );
      } else {
        toast.success(`Invoice ${invoice.sales_invoice_number} settled`);
      }
      onSettled();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to settle invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <CheckCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Settle Transaction
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Confirm the payment for invoice{" "}
            <span className="font-mono font-semibold text-foreground">
              {invoice?.sales_invoice_number}
            </span>
            . This marks the units as sold and completes the sale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isFinanced ? "Financed amount due" : "Amount due"}
              </span>
              <span className="font-mono text-base font-bold">
                {formatPeso(amountDue)}
              </span>
            </div>
            {isFinanced && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {financing?.provider ?? "Financing"}
                {financing?.loan_account_number
                  ? ` · Loan account ${financing.loan_account_number}`
                  : ""}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settle-amount" className="text-xs font-semibold">
              Amount received
            </label>
            <input
              id="settle-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
              className={`${inputClass} font-mono`}
            />
            {amountValid && variance !== 0 && (
              <p
                className={`text-[11px] font-medium ${
                  variance < 0 ? "text-rose-600" : "text-amber-600"
                }`}
              >
                {variance < 0 ? "Short by " : "Over by "}
                {formatPeso(Math.abs(variance))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settle-driver" className="text-xs font-semibold">
              Driver name{" "}
              <span className="font-normal text-muted-foreground">
                (leave blank for pick-up or Home Credit)
              </span>
            </label>
            <input
              id="settle-driver"
              type="text"
              maxLength={150}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={conformeReceived}
              onChange={(e) => setConformeReceived(e.target.checked)}
              disabled={submitting}
              className="size-4 rounded border-input"
            />
            Signed Conforme received
          </label>

          <div className="space-y-1.5">
            <label htmlFor="settle-remarks" className="text-xs font-semibold">
              Remarks{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="settle-remarks"
              type="text"
              maxLength={255}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={submitting}
              className={inputClass}
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !amountValid}
            className="flex-1 gap-1.5 bg-[#1d6b50] hover:bg-[#16533e] text-white shadow-xs font-semibold"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
