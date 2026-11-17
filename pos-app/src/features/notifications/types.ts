export type StockUnitsInsertedItem = {
  variant_id: number;
  name: string;
  model?: string | null;
  /** Number of serial numbers added for this variant */
  serials: number;
};

/** What the client sends to the socket server. */
export type StockUnitsInsertedRequest = {
  branchId?: string | number | null;
  totalSerials: number;
  items: StockUnitsInsertedItem[];
};

/** What the server relays to other users in the same branch. */
export type StockUnitsInsertedPayload = StockUnitsInsertedRequest & {
  insertedBy: string | null;
  insertedAt: string; // ISO date
};

/** Events added by the notifications feature. Merged into the socket types in lib/socket.ts. */
export type NotificationServerEvents = {
  stock_units_inserted: (payload: StockUnitsInsertedPayload) => void;
};

export type NotificationClientEvents = {
  stock_units_inserted: (
    payload: StockUnitsInsertedRequest,
    callback?: (error?: { message: string } | null) => void,
  ) => void;
};

export type NotificationLevel = "success" | "info" | "warning" | "error";

export type AppNotification = {
  id: string;
  kind: "stock_units_inserted";
  level: NotificationLevel;
  title: string;
  description?: string;
  createdAt: number; // epoch ms
  read: boolean;
};
