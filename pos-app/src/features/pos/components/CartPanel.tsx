import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  ChevronDown,
  Hash,
  Landmark,
  Loader2,
  PauseCircle,
  Plus,
  ReceiptText,
  Truck,
  UserRound,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CartLine, Customer, FinancingForm } from "../types/pos.types";
import { HOME_CREDIT, isFinancingComplete } from "../lib/financing";
import { ProductImage } from "./ProductImage";
import {
  CustomerSelectModal,
  customerFullName,
  type CustomerPage,
  type CustomerQuery,
} from "./CustomerSelectModal";

type CartPanelProps = {
  cart: CartLine[];
  total: number;
  customer: Customer | null;
  /** Fetches one page of customers (GET /customers) with search/filter params. */
  loadCustomers: (query: CustomerQuery) => Promise<CustomerPage>;
  paymentMethod: string;
  financing: FinancingForm;
  onFinancingChange: (next: FinancingForm) => void;
  message: string | null;
  isSubmitting: boolean;
  isParking: boolean;
  isPendingApproval: boolean;
  onCustomerChange: (customer: Customer | null) => void;
  onAddCustomer: () => void;
  onPaymentChange: (value: string) => void;
  onRemove: (line: CartLine) => void;
  onPark: () => void;
  onSubmit: () => void;
};

const PAYMENT_METHODS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "cash_pickup", label: "Cash pickup", icon: Banknote },
  { value: "cash_before_delivery", label: "Cash before delivery", icon: Truck },
  { value: "cash_on_delivery", label: "Cash on delivery", icon: Truck },
  { value: "charge", label: "Charge", icon: Wallet },
  { value: HOME_CREDIT, label: "Home Credit", icon: Landmark },
];

const money = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function CartPanel({
  cart,
  total,
  customer,
  loadCustomers,
  paymentMethod,
  financing,
  onFinancingChange,
  message,
  isSubmitting,
  isParking,
  isPendingApproval,
  onCustomerChange,
  onAddCustomer,
  onPaymentChange,
  onRemove,
  onPark,
  onSubmit,
}: CartPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isBusy = isSubmitting || isParking || isPendingApproval;
  const isActionDisabled = !cart.length || isBusy;

  // Home Credit sales need the loan details before charging. Parking stays
  // available so a sale can be held while the customer waits for approval.
  const isHomeCredit = paymentMethod === HOME_CREDIT;
  // A customer is required to charge (no walk-in sales). Parking stays available.
  const isChargeDisabled =
    isActionDisabled ||
    !customer ||
    (isHomeCredit && !isFinancingComplete(financing));
  const setFinancingField = (patch: Partial<FinancingForm>) =>
    onFinancingChange({ ...financing, ...patch });
  const financedSum =
    (Number(financing.financedAmount) || 0) +
    (Number(financing.downpaymentAmount) || 0);
  const showTotalMismatch =
    isHomeCredit &&
    Number(financing.financedAmount) > 0 &&
    Math.abs(financedSum - total) > 0.009;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <ReceiptText size={16} />
          </span>
          <h2 className="text-sm font-semibold text-foreground">
            Current sale
          </h2>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {cart.length} {cart.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ReceiptText size={22} />
            </span>
            <p className="text-sm font-semibold text-foreground">
              No items yet
            </p>
            <p className="text-xs text-muted-foreground">
              Tap a product or scan a barcode to start the sale.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-border">
            {cart.map((line) => {
              const lineTotal = line.price * (line.serial ? 1 : line.quantity);
              return (
                <li
                  key={`${line.variantId}-${line.serial ?? "quantity"}`}
                  className="flex items-center gap-3 px-1 py-3"
                >
                  <ProductImage
                    src={(line as CartLine & { imageUrl?: string }).imageUrl}
                    alt={line.name}
                    className="size-12 shrink-0 rounded-lg border border-border/60"
                    iconSize={16}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {line.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      <span className="truncate">{line.model}</span>
                      {line.serial ? (
                        <span className="flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                          <Hash size={9} />
                          {line.serial}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                          × {line.quantity}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[13px] font-semibold tabular-nums text-foreground">
                      ₱{money(lineTotal)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => onRemove(line)}
                      disabled={isBusy}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Checkout */}
      <div className="shrink-0 space-y-3 border-t border-dashed border-border bg-muted/30 p-4">
        {/* Total */}
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted-foreground">Total due</span>
          <span className="text-3xl font-bold leading-none tracking-tight tabular-nums text-foreground">
            <span className="mr-0.5 text-xl font-semibold text-muted-foreground">
              ₱
            </span>
            {money(total)}
          </span>
        </div>

        {message && (
          <p
            role="status"
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
          >
            {message}
          </p>
        )}

        {/* Payment method */}
        <div
          role="radiogroup"
          aria-label="Payment method"
          className="grid grid-cols-2 gap-1.5"
        >
          {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => {
            const active = paymentMethod === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isBusy}
                onClick={() => onPaymentChange(value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground/80 hover:border-primary/40",
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span className="leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Home Credit loan details */}
        {isHomeCredit && (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Home Credit loan
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 space-y-1">
                <span className="text-[11px] font-medium text-foreground/80">
                  Loan account number
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={financing.loanAccountNumber}
                  onChange={(e) =>
                    setFinancingField({ loanAccountNumber: e.target.value })
                  }
                  disabled={isBusy}
                  className="h-9 font-mono text-xs"
                />
              </label>
              <label className="col-span-2 space-y-1">
                <span className="text-[11px] font-medium text-foreground/80">
                  Delivery advice reference
                </span>
                <Input
                  type="text"
                  value={financing.deliveryAdviceRef}
                  onChange={(e) =>
                    setFinancingField({
                      deliveryAdviceRef: e.target.value,
                    })
                  }
                  disabled={isBusy}
                  className="h-9 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-foreground/80">
                  Financed amount
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={financing.financedAmount}
                  onChange={(e) =>
                    setFinancingField({ financedAmount: e.target.value })
                  }
                  disabled={isBusy}
                  className="h-9 text-xs tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-foreground/80">
                  Downpayment
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={financing.downpaymentAmount}
                  onChange={(e) =>
                    setFinancingField({ downpaymentAmount: e.target.value })
                  }
                  disabled={isBusy}
                  className="h-9 text-xs tabular-nums"
                />
              </label>
              <label className="col-span-2 space-y-1">
                <span className="text-[11px] font-medium text-foreground/80">
                  Approval date
                </span>
                <Input
                  type="date"
                  value={financing.approvedDate}
                  onChange={(e) =>
                    setFinancingField({ approvedDate: e.target.value })
                  }
                  disabled={isBusy}
                  className="h-9 text-xs"
                />
              </label>
            </div>
            {showTotalMismatch && (
              <p className="text-[11px] text-amber-600">
                Financed amount plus downpayment is ₱{money(financedSum)}, but
                the total is ₱{money(total)}. That is fine if loan fees are
                included.
              </p>
            )}
            {!isFinancingComplete(financing) && (
              <p className="text-[11px] text-muted-foreground">
                Enter the loan account number, financed amount and approval date
                to charge. You can still park the sale.
              </p>
            )}
          </div>
        )}

        {/* Customer */}
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Select customer"
            aria-haspopup="dialog"
            disabled={isBusy}
            onClick={() => setPickerOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-left text-xs text-foreground outline-none transition-colors hover:border-primary/40 focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50"
          >
            <UserRound size={14} className="shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                !customer && "text-muted-foreground",
              )}
            >
              {customer ? customerFullName(customer) : "Select a customer"}
            </span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-lg"
            onClick={onAddCustomer}
            aria-label="Add customer"
            disabled={isBusy}
          >
            <Plus size={16} />
          </Button>
        </div>

        {!customer && cart.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Select a customer to charge. You can still park the sale.
          </p>
        )}

        {/* Actions */}
        <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
          <Button
            type="button"
            disabled={isActionDisabled}
            onClick={onPark}
            variant="outline"
            className="h-12 gap-1.5 rounded-xl px-4 text-sm"
          >
            {isParking ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PauseCircle size={16} />
            )}
            Park
          </Button>

          <Button
            type="button"
            disabled={isChargeDisabled}
            onClick={onSubmit}
            className="h-12 justify-between gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm"
          >
            <span className="flex items-center gap-2">
              {isSubmitting || isPendingApproval ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUpRight size={16} />
              )}
              {isPendingApproval ? "Awaiting approval" : "Charge"}
            </span>
            <span className="tabular-nums">₱{money(total)}</span>
          </Button>
        </div>
      </div>

      <CustomerSelectModal
        open={pickerOpen}
        selected={customer}
        loadCustomers={loadCustomers}
        onSelect={onCustomerChange}
        onClose={() => setPickerOpen(false)}
        onAddCustomer={() => {
          setPickerOpen(false);
          onAddCustomer();
        }}
      />
    </aside>
  );
}
