import { useState } from "react";
import { useSocket } from "@/context/socketProvider";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Search,
  ArrowRight,
  User,
  CreditCard,
  Banknote,
  Calendar,
  AlertCircle,
  RotateCw,
  FileText,
} from "lucide-react";
import { salesApi } from "@/features/pos/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ParkedSale {
  id: number;
  sales_invoice_number: string;
  date_of_purchase: string;
  total_amount: number;
  payment_method: string;
  status: string;
  reference_note: string | null;
  customer: { id: number; full_name: string } | null;
  employee: { id: number; name: string } | null;
  authorized_by: { id: number; name: string } | null;
  authorized_at: string | null;
  branch_id: number;
  created_at: string;
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatPaymentMethod(method: string) {
  switch (method) {
    case "cash_before_delivery":
      return {
        label: "Cash on Delivery",
        icon: Banknote,
        color: "text-amber-700 bg-amber-500/10 border-amber-500/20",
      };
    case "card_installment":
      return {
        label: "Installment",
        icon: CreditCard,
        color: "text-blue-700 bg-blue-500/10 border-blue-500/20",
      };
    case "card_straight":
      return {
        label: "Straight Card",
        icon: CreditCard,
        color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
      };
    default:
      return {
        label: method.replace(/_/g, " "),
        icon: CreditCard,
        color: "text-muted-foreground bg-muted border-border",
      };
  }
}

export function ParkSalePage() {
  const socket = useSocket();
  const [search, setSearch] = useState("");
  const [resumeSale, setResumeSale] = useState<ParkedSale | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["parked-sales"],
    queryFn: () => salesApi.getParked(1, 10),
    refetchOnWindowFocus: false,
  });

  const sales: ParkedSale[] = response?.data ?? [];
  const totalParked = response?.pagination?.total_items ?? sales.length;

  const filteredSales = sales.filter((sale) => {
    const term = search.toLowerCase();
    return (
      sale.sales_invoice_number.toLowerCase().includes(term) ||
      sale.customer?.full_name?.toLowerCase().includes(term) ||
      sale.employee?.name?.toLowerCase().includes(term)
    );
  });

  const handleResume = async (withAuthorization: boolean) => {
    if (!resumeSale || isResuming) return;
    setIsResuming(true);
    setMessage(null);

    try {
      if (withAuthorization) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "request_invoice_authorization",
            {
              invoiceId: resumeSale.id,
              invoiceNumber: resumeSale.sales_invoice_number,
              totalAmount: resumeSale.total_amount,
              customerName: resumeSale.customer?.full_name,
            },
            (err) => (err ? reject(new Error(err.message)) : resolve()),
          );
        });

        setMessage("Authorization request sent to the Sales OIC.");
      } else {
        await salesApi.resumeWithoutAuthorization(resumeSale.id);
        setMessage("Sale resumed and marked pending authorization.");
      }

      setResumeSale(null);
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to resume sale.");
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Pinned Header Bar */}
      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Parked Transactions
          </h1>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {totalParked} on hold
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or name..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh parked orders"
            className="size-8 shrink-0"
          >
            <RotateCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {message && (
        <div className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          {message}
        </div>
      )}

      {/* Scrollable List / Grid Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-20 animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">
                Unable to fetch parked orders:{" "}
              </span>
              {error?.message || "Unknown error"}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-7 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">
              No matching parked sales
            </p>
            <p className="text-[11px] text-muted-foreground">
              {search
                ? "Try adjusting your search query."
                : "All transactions are currently clear."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSales.map((sale) => {
              const payment = formatPaymentMethod(sale.payment_method);
              const PaymentIcon = payment.icon;

              return (
                <div
                  key={sale.id}
                  className="group relative flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/50 sm:flex-row sm:items-center"
                >
                  {/* Left Column: ID, Customer, Staff */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/50 text-primary">
                      <Clock3 className="size-4" />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {sale.sales_invoice_number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${payment.color}`}
                        >
                          <PaymentIcon className="size-3" />
                          {payment.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-foreground truncate">
                        <User className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-xs truncate">
                          {sale.customer?.full_name?.trim() ||
                            "Walk-in Customer"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>
                          Staff:{" "}
                          <span className="font-medium text-foreground">
                            {sale.employee?.name || "Unassigned"}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" />
                          {dateFormatter.format(new Date(sale.created_at))}
                        </span>
                      </div>

                      {sale.reference_note && (
                        <p className="text-[11px] italic text-muted-foreground truncate">
                          "{sale.reference_note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Pricing & Action Button */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 sm:border-0 sm:pt-0 sm:justify-end sm:gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Total Due
                      </span>
                      <p className="text-base font-bold text-foreground">
                        {currencyFormatter.format(sale.total_amount)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setResumeSale(sale)}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      Resume
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Dialog */}
      <Dialog
        open={!!resumeSale}
        onOpenChange={(open) => !open && setResumeSale(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Resume parked sale</DialogTitle>
            <DialogDescription className="text-xs">
              Choose whether this sale should continue immediately or wait for
              Sales OIC authorization[cite: 23].
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2 py-2">
            <Button
              disabled={isResuming}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleResume(false)}
            >
              Continue without authorization
            </Button>
            <Button
              disabled={isResuming}
              size="sm"
              className="text-xs"
              onClick={() => handleResume(true)}
            >
              Continue with authorization
            </Button>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </div>
  );
}
