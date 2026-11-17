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
import { Package, User, CreditCard, Loader2 } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Extract transaction and calculate total

  const transaction = payload?.transaction || {};
  const items = transaction.items || [];

  // Fetch employee details
  const employeeId = transaction.employee_id;
  const { data: employeeData } = useEmployee(employeeId);
  const employee = employeeData?.data;

  const totalAmount = useMemo(() => {
    return items.reduce(
      (acc: number, item: any) => acc + (item.unit_price_at_sale || 0),
      0,
    );
  }, [items]);

  const handleAction = (type: "approve" | "reject") => {
    if (!socket || !payload) return;
    setIsSubmitting(true);

    const event =
      type === "approve" ? "approve_transaction" : "reject_transaction";
    const data =
      type === "approve"
        ? { transaction, userId: payload.fromUser }
        : { userId: payload.fromUser, reason: "Rejected by OIC", transaction };

    socket.emit(event, data, (err: any) => {
      setIsSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && setOpen(val)}>
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
                    {it.serials?.map((s: string) => {
                      return (
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
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => handleAction("reject")}
            disabled={isSubmitting}
            className="text-destructive hover:bg-destructive/10"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Void"
            )}
          </Button>
          <Button
            onClick={() => handleAction("approve")}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Authorize Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
