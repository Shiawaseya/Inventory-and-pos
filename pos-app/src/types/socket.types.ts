// socket.types.ts
export interface ServerToClientEvents {
  reply: (message: string) => void;
  inventoryUpdated: (data: any) => void;
  stock_units_inserted: (payload: {
    branchId: string;
    totalSerials: number;
    items: Array<{
      variant_id: number;
      name: string;
      model: string | null;
      serials: number;
    }>;
    insertedBy: string | null;
    insertedAt: string;
  }) => void;
  transaction_pending: (payload: any) => void;
  transaction_pending_ack: (payload: any) => void;
  transaction_approved: (payload: {
    transaction?: any;
    response?: any;
  }) => void;
  transaction_rejected: (payload: {
    transaction?: any;
    reason?: string;
    response?: any;
  }) => void;
  transaction_pending_authorization: (payload: {
    transaction?: any;
    response?: any;
    message?: string;
  }) => void;
  transaction_failed: (payload: { transaction?: any; error?: string }) => void;
  authorization_request_sent: (payload: { invoiceId: number }) => void;
  invoice_authorization_requested: (payload: {
    invoiceId: number;
    invoiceNumber?: string;
    totalAmount?: number;
    customerName?: string;
    requesterId: string | null;
  }) => void;
  invoice_authorization_approved: (payload: {
    invoiceId: number;
    invoiceNumber?: string;
    authorizedBy?: string | null;
    data?: any;
  }) => void;
  invoice_authorization_rejected: (payload: {
    invoiceId: number;
    invoiceNumber?: string;
    reason: string;
  }) => void;
  branch_inventory_updated: (payload: {
    branchId: string;
    itemId?: number;
    variantId?: number;
    branchItemId?: number;
    updatedBy?: string | null;
    updatedAt: string;
  }) => void;
  item_catalog_updated: (payload: {
    branchId: string;
    itemId?: number;
    updatedBy?: string | null;
    updatedAt: string;
  }) => void;
}

export interface ClientToServerEvents {
  message: (msg: string) => void;
  updateInventory: (data: any) => void;
  stock_units_inserted: (
    payload: {
      items: Array<{
        variant_id: number;
        name: string;
        model?: string | null;
        serials: number;
      }>;
    },
    callback?: (err: any) => void,
  ) => void;
  item_catalog_updated: (
    payload: { itemId?: number },
    callback?: (err: any) => void,
  ) => void;
  branch_inventory_updated: (
    payload: {
      itemId?: number;
      variantId?: number;
      branchItemId?: number;
    },
    callback?: (err: any) => void,
  ) => void;
  submit_transaction: (
    payload: any,
    callback?: (err: any, res?: any) => void,
  ) => void;
  approve_transaction: (
    payload: { transaction?: any; userId?: string; meta?: any },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  later_transaction: (
    payload: { transaction?: any; userId?: string; isPrint?: boolean },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  reject_transaction: (
    payload: { userId?: string; reason?: string; transaction?: any },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  request_invoice_authorization: (
    payload: {
      invoiceId: number;
      invoiceNumber?: string;
      totalAmount?: number;
      customerName?: string;
    },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  approve_invoice_authorization: (
    payload: {
      invoiceId: number;
      requesterId: string;
      invoiceNumber?: string;
      isPrint?: boolean;
    },
    callback?: (err?: any, res?: any) => void,
  ) => void;
  reject_invoice_authorization: (
    payload: {
      invoiceId: number;
      requesterId: string;
      invoiceNumber?: string;
      reason?: string;
    },
    callback?: (err?: any, res?: any) => void,
  ) => void;
}
