import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { handleRemoteStockUnitsInserted } from "../utils/stockNotifications";

/**
 * Cross-feature socket handlers that should run for the whole app.
 * Mount once (ToastContainer does this). To add a new notification:
 * register another `socket.on(...)` below and clean it up in the return.
 *
 * Not included on purpose (already handled by their own features, adding
 * them here would duplicate toasts): transaction_pending, transaction_approved,
 * transaction_failed, transaction_rejected, invoice_authorization_*.
 */
export function useGlobalNotifications() {
  useEffect(() => {
    socket.on("stock_units_inserted", handleRemoteStockUnitsInserted);

    return () => {
      socket.off("stock_units_inserted", handleRemoteStockUnitsInserted);
    };
  }, []);
}
