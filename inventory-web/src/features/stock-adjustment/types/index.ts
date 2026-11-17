// ==========================================
// ENUMS & PRIMITIVES
// ==========================================

export type StockAdjustmentReason =
  | "damaged"
  | "expired"
  | "lost_theft"
  | "inventory_audit"
  | "internal_use"
  | "found_stock"
  | "inspection"
  | "other";

export type StockUnitStatus =
  | "available"
  | "under_inspection"
  | "sold"
  | "reserved"
  | "damaged"
  | "returned"
  | "lost"
  | "written_off";

export interface AdjustedByUser {
  id: number;
  name: string;
}

// ==========================================
// ENTITY & DETAIL TYPES
// ==========================================

/** Represents an individual unit modified within an adjustment */
export interface StockAdjustmentItemRecord {
  id: number;
  stock_unit_id: number;
  serial_number: string;
  product_name?: string;
  sku?: string;
  previous_status: StockUnitStatus;
  new_status: StockUnitStatus;
  notes: string | null;
}

/** Summary record returned in branch listing */
export interface StockAdjustmentRecord {
  id: number;
  adjustment_number: string;
  branch_id: number;
  reason: StockAdjustmentReason;
  notes: string | null;
  adjusted_by: AdjustedByUser | null;
  total_items: number;
  created_at: string;
  items?: StockAdjustmentItemRecord[]; // Present on detailed views or expandable rows
}

// ==========================================
// FORM & MUTATION PAYLOADS
// ==========================================

/** UI state item in AdjustmentForm before submission */
export interface StockUnitItemPayload {
  stock_unit_id: number;
  serial_number: string;
  product_name?: string;
  previous_status: StockUnitStatus;
  new_status: StockUnitStatus;
  notes?: string;
}

/** Network payload sent to POST /stock-adjustments */
export interface CreateAdjustmentPayload {
  branch_id?: number;
  reason: StockAdjustmentReason;
  notes?: string;
  items: {
    stock_unit_id: number;
    new_status: StockUnitStatus;
    notes?: string;
  }[];
}

// ==========================================
// API & QUERY TYPES
// ==========================================

export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  links: PaginationLinks;
  pagination: PaginationMeta;
}

export interface GetAdjustmentsParams {
  branch_id?: number;
  page?: number;
  per_page?: number;
  reason?: StockAdjustmentReason;
  search?: string;
}

// ==========================================
// REASON-TO-STATUS AUTO-MAPPING UTILITY
// ==========================================

/** Suggests the default new status based on chosen adjustment reason */
export const DEFAULT_STATUS_BY_REASON: Record<
  StockAdjustmentReason,
  StockUnitStatus
> = {
  damaged: "damaged",
  expired: "written_off",
  lost_theft: "lost",
  inventory_audit: "available",
  internal_use: "written_off",
  found_stock: "available",
  inspection: "under_inspection",
  other: "available",
};
