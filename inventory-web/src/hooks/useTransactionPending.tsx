import { useEffect, useState, useMemo } from "react";
import { useEmployee } from "@/query/useEmployee";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/socketProvider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  User,
  CreditCard,
  Loader2,
  Clock,
  Check,
  Ban,
} from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { SerialItemHover } from "./SerialItemHover";

export default function TransactionPendingListener() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handler = (p: any) => {
      setPayload(p);
      setOpen(true);
    };

    socket.on("transaction_pending", handler);
    return () => {
      socket.off("transaction_pending", handler);
    };
  }, [socket]);

  const transaction = payload?.transaction || {};
  const items = transaction.items || [];

  const employeeId = transaction.employee_id;
  const { data: employeeData } = useEmployee(employeeId);
  const employee = employeeData?.data;

  const totalAmount = useMemo(() => {
    return items.reduce(
      (acc: number, item: any) => acc + (item.unit_price_at_sale || 0),
      0,
    );
  }, [items]);

  const handleAction = (type: "approve" | "later" | "void") => {
    if (!socket || !payload) return;
    setSubmittingAction(type);

    let event = "later_transaction";
    let data: any = {
      transaction,
      userId: payload.fromUser,
      isPrint: false, // <-- Explicitly false when "Later" is chosen
    };

    if (type === "approve") {
      event = "approve_transaction";
      data = {
        transaction,
        userId: payload.fromUser,
        isPrint: true,
      };
    } else if (type === "void") {
      event = "reject_transaction";
      data = {
        userId: payload.fromUser,
        reason: "Voided by Sales OIC",
        transaction,
      };
    }

    socket.emit(event, data, (err: any) => {
      setSubmittingAction(null);
      if (err) {
        console.error(`${event} error`, err);
      } else {
        setOpen(false);
        setPayload(null);
      }
    });
  };

  if (!payload) return null;

  const { customer } = transaction;
  const paymentMethod = String(transaction.payment_method ?? "cash")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
  const financing = transaction.financing;
  const isHomeCredit =
    String(transaction.payment_method ?? "")
      .toLowerCase()
      .replace(/[_\s-]/g, "") === "homecredit";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !submittingAction && setOpen(val)}
    >
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-yellow-600" />
            </div>
            <DialogTitle>Authorization Required</DialogTitle>
          </div>
          <DialogDescription>
            User <b>{payload.fromUser}</b> is requesting approval for a
            transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div className="col-span-2 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Employee
            </span>
            <p className="font-medium">
              {employee
                ? `${employee.first_name} ${employee.middle_name ? employee.middle_name + " " : ""}${employee.last_name}`
                : employeeId}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <span className="text-muted-foreground">Customer</span>
            <p className="font-medium bg-secondary/50 p-2 rounded-md">
              {customer
                ? `${customer.first_name} ${customer.last_name}`
                : "Walk-in Customer"}
              {customer?.contact_number && (
                <span className="block text-xs text-muted-foreground font-normal">
                  {customer.contact_number}
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Payment method</span>
            <p className="font-medium capitalize">{paymentMethod}</p>
          </div>
          {isHomeCredit && financing && (
            <div className="col-span-2 space-y-2 rounded-md border bg-secondary/30 p-3">
              <span className="text-muted-foreground">Home Credit financing</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Loan account</span>
                  <p className="font-medium">
                    {financing.loan_account_number || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Delivery advice ref
                  </span>
                  <p className="font-medium">
                    {financing.delivery_advice_ref || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Financed amount</span>
                  <p className="font-medium">
                    ₱{Number(financing.financed_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Downpayment</span>
                  <p className="font-medium">
                    ₱{Number(financing.downpayment_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Approved date</span>
                  <p className="font-medium">
                    {financing.approved_date || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" /> Items ({items.length})
            </h4>
            <Badge variant="outline" className="text-primary">
              Total: ₱{totalAmount.toLocaleString()}
            </Badge>
          </div>

          <ScrollArea className="h-45 w-full rounded-md border p-3 bg-slate-50/50">
            <div className="space-y-3">
              {items.map((it: any, i: number) => (
                <div
                  key={i}
                  className="text-xs border-b border-slate-200 pb-2 last:border-0"
                >
                  <div className="flex justify-between font-medium mb-1">
                    <span>Variant #{it.variant_id}</span>
                    <span>₱{it.unit_price_at_sale.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {it.serials?.map((s: string) => (
                      <HoverCard key={s}>
                        <HoverCardTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0 font-mono cursor-pointer"
                          >
                            {s}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <SerialItemHover serial={s} />
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => handleAction("void")}
            disabled={!!submittingAction}
            className="text-destructive hover:bg-destructive/10"
          >
            {submittingAction === "void" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-2 h-4 w-4" />
            )}
            Void
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction("later")}
              disabled={!!submittingAction}
            >
              {submittingAction === "later" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Later
            </Button>

            <Button
              onClick={() => handleAction("approve")}
              disabled={!!submittingAction}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submittingAction === "approve" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Authorize
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
