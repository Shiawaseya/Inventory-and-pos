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
  is_active?: boolean;
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