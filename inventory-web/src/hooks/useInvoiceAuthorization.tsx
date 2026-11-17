import { useEffect, useState } from "react";
import { useSocket } from "@/context/socketProvider";
import { loginApi } from "@/features/authentications/api/loginApi";
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

type AuthorizationRequest = {
  invoiceId: number;
  invoiceNumber?: string;
  totalAmount?: number;
  customerName?: string;
  requesterId?: string;
};

export default function InvoiceAuthorizationListener() {
  const socket = useSocket();
  const [request, setRequest] = useState<AuthorizationRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleRequest = (payload: AuthorizationRequest) => {
      setMessage(null);
      setRequest(payload);
    };

    socket.on("invoice_authorization_requested", handleRequest);
    return () => {
      socket.off("invoice_authorization_requested", handleRequest);
    };
  }, [socket]);

  const authorize = async () => {
    if (!request || isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const token = loginApi.getToken();
      const response = await fetch(
        `${API_BASE_URL}/sales/${request.invoiceId}/authorize`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ isPrint: false }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Unable to authorize invoice");
      }
      setRequest(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to authorize invoice",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && setRequest(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authorize parked sale</DialogTitle>
          <DialogDescription>
            A cashier requested authorization before continuing this
            transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <p>
            <strong>Invoice:</strong>{" "}
            {request.invoiceNumber ?? request.invoiceId}
          </p>
          <p>
            <strong>Customer:</strong>{" "}
            {request.customerName || "Walk-in customer"}
          </p>
          {request.totalAmount != null && (
            <p>
              <strong>Total:</strong> PHP{" "}
              {Number(request.totalAmount).toFixed(2)}
            </p>
          )}
        </div>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setRequest(null)}
          >
            Later
          </Button>
          <Button disabled={isSubmitting} onClick={authorize}>
            {isSubmitting ? "Authorizing..." : "Authorize sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
