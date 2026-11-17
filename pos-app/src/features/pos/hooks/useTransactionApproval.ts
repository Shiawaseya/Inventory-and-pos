import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/context/socketProvider";

export type ApprovalState = "idle" | "submitting" | "pending_oic" | "fallback";

export type FallbackReason = "OIC_OFFLINE" | "TIMEOUT" | "REJECTED" | "ERROR";

export function useTransactionApproval(onSuccess: (response: any) => void) {
  const socket = useSocket();
  const [state, setState] = useState<ApprovalState>("idle");
  const [fallbackReason, setFallbackReason] = useState<FallbackReason | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // 1. Push Listeners from OIC
  useEffect(() => {
    if (!socket) {
      console.warn("[Hook] Socket context is null in useTransactionApproval");
      return;
    }

    console.log("[Hook] Attaching socket listeners to socket ID:", socket.id);

    // OIC clicked "Authorize"
    const handleApproved = (payload: { response?: any }) => {
      console.log("[Hook: EVENT] -> transaction_approved:", payload);
      setState("idle");
      setFallbackReason(null);
      setErrorMessage(null);
      onSuccessRef.current?.(payload.response);
    };

    // OIC clicked "Later" (Saved in DB as pending_authorization)
    const handlePendingAuthorization = (payload: {
      response?: any;
      message?: string;
    }) => {
      console.log(
        "[Hook: EVENT] -> transaction_pending_authorization:",
        payload,
      );
      setState("idle");
      setFallbackReason(null);
      setErrorMessage(null);
      onSuccessRef.current?.({
        ...payload.response,
        message:
          payload.message ||
          `Sale marked for later authorization. Invoice: ${
            payload.response?.data?.sales_invoice_number || ""
          }`,
      });
    };

    // OIC clicked "Void" (Saved in DB as voided)
    const handleRejected = (payload: { reason?: string; response?: any }) => {
      console.log("[Hook: EVENT] -> transaction_rejected:", payload);
      setState("fallback");
      setFallbackReason("REJECTED");
      const invoiceNumber = payload?.response?.data?.sales_invoice_number;
      setErrorMessage(
        payload?.reason
          ? `${payload.reason}${
              invoiceNumber ? ` (Voided Invoice: ${invoiceNumber})` : ""
            }`
          : "Transaction was voided by Sales OIC.",
      );
    };

    // Generic transaction failure (e.g., DB exception on backend)
    const handleFailed = (payload: { error?: string }) => {
      console.log("[Hook: EVENT] -> transaction_failed:", payload);
      setState("fallback");
      setFallbackReason("ERROR");
      setErrorMessage(payload?.error || "Transaction failed to process.");
    };

    socket.on("transaction_approved", handleApproved);
    socket.on("transaction_pending_authorization", handlePendingAuthorization);
    socket.on("transaction_rejected", handleRejected);
    socket.on("transaction_failed", handleFailed);

    return () => {
      console.log("[Hook] Cleaning up listeners on socket ID:", socket.id);
      socket.off("transaction_approved", handleApproved);
      socket.off(
        "transaction_pending_authorization",
        handlePendingAuthorization,
      );
      socket.off("transaction_rejected", handleRejected);
      socket.off("transaction_failed", handleFailed);
    };
  }, [socket]);

  // 2. Submit Transaction via Socket
  const submit = useCallback(
    (payload: any, timeoutMs = 15000) => {
      console.log(
        "[Hook: submit] Called. Current state:",
        state,
        "Socket connected:",
        socket?.connected,
      );

      if (!socket) {
        console.error("[Hook: submit] Aborted: Socket is null");
        setState("fallback");
        setFallbackReason("ERROR");
        setErrorMessage("Socket connection unavailable.");
        return;
      }

      setState("submitting");
      setErrorMessage(null);
      setFallbackReason(null);

      console.log(
        `[Hook: submit] Emitting 'submit_transaction' (timeout: ${timeoutMs}ms)...`,
      );

      (socket as any)
        .timeout(timeoutMs)
        .emit("submit_transaction", payload, (err: any, response: any) => {
          console.log("[Hook: ACK RECEIVED] err:", err, "response:", response);

          // Resolve error from either first arg (err) OR second arg (response.message/response.error)
          const errorPayload =
            err ||
            (response?.message && response?.status !== "pending"
              ? response
              : null);

          if (errorPayload) {
            const rawMsg =
              typeof errorPayload === "string"
                ? errorPayload
                : errorPayload?.message ||
                  (typeof errorPayload === "object"
                    ? JSON.stringify(errorPayload)
                    : "Unknown error");

            console.warn(
              "[Hook: ACK ERROR] Setting state to 'fallback'. Raw error:",
              rawMsg,
            );

            setState("fallback");

            if (
              rawMsg.includes("timed out") ||
              rawMsg.includes("TimeoutError") ||
              errorPayload?.name === "TimeoutError"
            ) {
              setFallbackReason("TIMEOUT");
              setErrorMessage("Sales OIC authorization request timed out.");
            } else if (
              rawMsg.includes("OIC_OFFLINE") ||
              rawMsg.includes("NO_OIC_ASSIGNED")
            ) {
              setFallbackReason("OIC_OFFLINE");
              setErrorMessage(
                "No Sales OIC is currently online or available to approve.",
              );
            } else {
              setFallbackReason("ERROR");
              setErrorMessage(
                rawMsg || "Failed to contact authorization service.",
              );
            }
            return;
          }

          if (response?.status === "pending") {
            console.log(
              "[Hook: ACK SUCCESS] Status is 'pending'. Awaiting OIC decision push...",
            );
            setState("pending_oic");
          } else {
            console.warn(
              "[Hook: ACK UNKNOWN] Unhandled response payload:",
              response,
            );
          }
        });
    },
    [socket, state],
  );

  const reset = useCallback(() => {
    console.log("[Hook: reset] Resetting state to idle");
    setState("idle");
    setFallbackReason(null);
    setErrorMessage(null);
  }, []);

  return {
    state,
    fallbackReason,
    errorMessage,
    submit,
    reset,
  };
}
