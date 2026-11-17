import { Toaster } from "sonner";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";

/**
 * Mount once near the app root. Renders the toast outlet and wires up the
 * global socket notification handlers.
 * If you already render <Toaster /> elsewhere, remove that one.
 */
export default function ToastContainer() {
  useGlobalNotifications();
  return <Toaster richColors closeButton position="top-right" />;
}
