// socket.types.ts
export interface ServerToClientEvents {
  reply: (message: string) => void;
  inventoryUpdated: (data: any) => void; // replace `any` with real type
  transaction_pending: (payload: any) => void;
  invoice_authorization_requested: (payload: {
    invoiceId: number;
    invoiceNumber?: string;
    totalAmount?: number;
    customerName?: string;
    requesterId?: string;
  }) => void;
}

export interface ClientToServerEvents {
  message: (msg: string) => void;
  updateInventory: (data: any) => void;
  approve_transaction: (
    payload: { transaction?: any; userId?: string; meta?: any },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  reject_transaction: (
    payload: { userId?: string; reason?: string; transaction?: any },
    callback?: (err?: any, res?: any) => void,
  ) => void;
}
