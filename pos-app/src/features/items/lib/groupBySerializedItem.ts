export type VariantRow = {
  branch_item_id: number;
  variant_id: number;
  model: string;
  sku?: string | null;
  image_url?: string | null;
  item_id: number;
  branch_id: number;
  price: number | null;
  reorder_level: number | null;
  updated_at: string;
  is_serialized: boolean;
  stock_quantity: number;
  reserved_count: number;
  damaged_count: number;
  available_count: number;
  item: { name: string; image_url?: string | null };
};

export type GroupedInventoryItem = {
  item_id: number;
  item: { name: string; image_url?: string | null };
  is_serialized: boolean;
  variants: VariantRow[];
};

export function groupBySerializedItems(
  rows: VariantRow[] | any[],
): GroupedInventoryItem[] {
  const map = new Map<number, GroupedInventoryItem>();

  for (const r of rows) {
    const itemId = Number(r.item_id);
    const existing = map.get(itemId);

    const variant: VariantRow = {
      branch_item_id: r.branch_item_id,
      variant_id: r.variant_id,
      model: r.model,
      sku: r.sku ?? null,
      image_url: r.image_url ?? null,
      item_id: r.item_id,
      branch_id: r.branch_id,
      price: r.price ?? null,
      reorder_level: r.reorder_level ?? null,
      updated_at: r.updated_at ?? String(new Date()),
      is_serialized: !!r.is_serialized,
      stock_quantity: Number(r.stock_quantity ?? 0),
      reserved_count: Number(r.reserved_count ?? 0),
      damaged_count: Number(r.damaged_count ?? 0),
      available_count: Number(r.available_count ?? 0),
      item: r.item ?? { name: "", image_url: null },
    };

    if (existing) {
      existing.variants.push(variant);
    } else {
      map.set(itemId, {
        item_id: itemId,
        item: variant.item,
        is_serialized: variant.is_serialized,
        variants: [variant],
      });
    }
  }

  return Array.from(map.values());
}

export default groupBySerializedItems;
