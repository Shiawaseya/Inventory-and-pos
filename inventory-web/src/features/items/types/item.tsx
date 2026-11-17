interface brand {
  id: number;
  name: string;
}

interface category {
  id: number;
  name: string;
}

export interface Variant {
  variant_id?: number;
  item_id?: number;
  model: string;
  sku?: string;
  initial_serial_number?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  branch_item_id?: number | null;
  branch_configuration?: {
    branch_id: number;
    price: number | null;
    reorder_level: number | null;
    updated_at: string;
  } | null;
}

export interface Item {
  id: number;
  name: string;
  imageUrl: string | null;
  category: category | null;
  brand: brand | null;
  model: string[];
  isSerialized: boolean;
  variants?: Variant[];
}
