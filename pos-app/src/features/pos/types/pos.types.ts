import type {
  GroupedInventoryItem,
  VariantRow,
} from "@/features/items/lib/groupBySerializedItem";

export type { GroupedInventoryItem, VariantRow };

export type CartLine = {
  variantId: number;
  name: string;
  model: string;
  price: number;
  quantity: number;
  serial?: string;
  imageUrl?: string | null;
};

export type Customer = {
  customer_id?: number | string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  contact_number?: string;
};

export type ProductSelection = GroupedInventoryItem | null;

/** Home Credit (or other lender) details as typed on the checkout screen. */
export type FinancingForm = {
  loanAccountNumber: string;
  deliveryAdviceRef: string;
  financedAmount: string;
  downpaymentAmount: string;
  /** YYYY-MM-DD */
  approvedDate: string;
};

/** Shape the API expects in the sale payload (`financing`). */
export type FinancingPayload = {
  provider: string;
  loan_account_number: string;
  delivery_advice_ref: string;
  financed_amount: number;
  downpayment_amount: number;
  approved_date: string;
};
