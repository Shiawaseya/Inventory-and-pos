import { toast } from "sonner";
import { socket } from "@/lib/socket";
import { useNotificationStore } from "../store/notificationStore";
import type {
  StockUnitsInsertedItem,
  StockUnitsInsertedPayload,
} from "../types";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function itemLabel(item: StockUnitsInsertedItem) {
  return item.model ? `${item.name} (${item.model})` : item.name;
}

export function describeStockInsert(
  items: StockUnitsInsertedItem[],
  totalSerials: number,
) {
  const [first] = items;
  if (!first) return plural(totalSerials, "serial number");
  const others = items.length - 1;
  return `${plural(totalSerials, "serial number")} added to ${itemLabel(first)}${
    others > 0 ? ` and ${plural(others, "other item")}` : ""
  }.`;
}

/** Show a toast and add an entry to the notification center. */
function show(title: string, description: string, id: string) {
  toast.success(title, { description, id });
  useNotificationStore.getState().add({
    id,
    kind: "stock_units_inserted",
    level: "success",
    title,
    description,
  });
}

/**
 * Call after stock units were saved by THIS user:
 * toasts locally and tells the server so teammates get notified too.
 */
export function notifyStockUnitsInserted(
  items: StockUnitsInsertedItem[],
  branchId?: string | number | null,
) {
  const totalSerials = items.reduce((sum, item) => sum + item.serials, 0);
  if (totalSerials === 0) return;

  show(
    "Stock units saved",
    describeStockInsert(items, totalSerials),
    `stock-local-${Date.now()}`,
  );

  if (socket.connected) {
    socket.emit("stock_units_inserted", { branchId, totalSerials, items });
  }
}

/** Handler for stock units inserted by SOMEONE ELSE (relayed by the server). */
export function handleRemoteStockUnitsInserted(
  payload: StockUnitsInsertedPayload,
) {
  const who = payload.insertedBy
    ? `Employee #${payload.insertedBy}`
    : "A teammate";
  show(
    "Stock updated",
    `${who}: ${describeStockInsert(payload.items, payload.totalSerials)}`,
    `stock-remote-${payload.insertedAt}-${payload.insertedBy ?? "x"}`,
  );
}
