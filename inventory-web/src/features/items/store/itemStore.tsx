import React, { useCallback, useMemo, useState } from "react";
import type { CreateItemRequest } from "@/features/items/api/itemsApi";

type UiItemPayload = CreateItemRequest & {
  sku?: string;
  price?: number | string;
  quantity?: number | string;
  description?: string;
};

type ItemStore = {
  name: string;
  setName: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  price: string | number;
  setPrice: (v: string | number) => void;
  qty: number | "";
  setQty: (v: number | "") => void;
  model: string;
  setModel: (v: string) => void;
  models: string[];
  setModels: (v: string[]) => void;
  reorderLevel: number | "";
  setReorderLevel: (v: number | "") => void;
  isSerialized: boolean;
  setIsSerialized: (v: boolean) => void;
  brandId: number | null;
  setBrandId: (v: number | null) => void;
  categoryId: number | null;
  setCategoryId: (v: number | null) => void;
  image: File | null;
  setImage: (f: File | null) => void;
  reset: () => void;
  toPayload: (overrides?: { brand_id?: number; category_id?: number; updated_by?: number }) => UiItemPayload;
};

const ItemStoreContext = React.createContext<ItemStore | null>(null);

export function ItemStoreProvider({ children, initial }: { children: React.ReactNode; initial?: Partial<UiItemPayload> }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState<string | number>(initial?.price ?? "");
  const _initialQty = (() => {
    const v = initial?.quantity;
    const s = v == null ? "" : String(v);
    if (s === "") return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  })();
  const [qty, setQty] = useState<number | "">(_initialQty as number | "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [models, setModels] = useState<string[]>(Array.isArray(initial?.models) ? (initial?.models as string[]) : []);
  const _initialReorder = (() => {
    const v = initial?.reorder_level;
    const s = v == null ? "" : String(v);
    if (s === "") return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  })();
  const [reorderLevel, setReorderLevel] = useState<number | "">(_initialReorder as number | "");
  const [isSerialized, setIsSerialized] = useState(true);
  const [brandId, setBrandId] = useState<number | null>(initial?.brand_id ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
  const [image, setImage] = useState<File | null>(null);

  const reset = useCallback(() => {
    setName("");
    setSku("");
    setDescription("");
    setPrice("");
    setQty("");
    setModel("");
    setModels([]);
    setReorderLevel("");
    setIsSerialized(true);
    setBrandId(null);
    setCategoryId(null);
    setImage(null);
  }, []);

  const toPayload = useCallback(
    (overrides?: { brand_id?: number; category_id?: number; updated_by?: number }) => {
      const payload: UiItemPayload = {
        name: String(name ?? "").trim(),
        brand_id: overrides?.brand_id ?? (brandId ?? undefined),
        model: model?.trim() || undefined,
        models: models && models.length > 0 ? models : undefined,
        reorder_level: reorderLevel === "" ? undefined : Number(reorderLevel),
        category_id: overrides?.category_id ?? (categoryId ?? undefined),
        is_serialized: isSerialized ? 1 : 0,
        updated_by: overrides?.updated_by ?? undefined,
        sku: sku?.trim() || undefined,
        price: typeof price === "string" && String(price).trim() !== "" ? Number(price) : (price === "" ? undefined : (price as number | undefined)),
        quantity: qty === "" ? undefined : Number(qty),
        description: description?.trim() || undefined,
      };

      return payload;
    },
    [name, sku, description, price, qty, model, models, reorderLevel, isSerialized, brandId, categoryId]
  );

  // createItem sends a minimal payload matching backend expectation
  // createItem moved to mutation hook; store only builds payload/state

  const store = useMemo(() => ({
    name,
    setName,
    sku,
    setSku,
    description,
    setDescription,
    price,
    setPrice,
    qty,
    setQty,
    model,
    setModel,
    models,
    setModels,
    reorderLevel,
    setReorderLevel,
    isSerialized,
    setIsSerialized,
    brandId,
    setBrandId,
    categoryId,
    setCategoryId,
    image,
    setImage,
    reset,
    toPayload,
  }), [
    name,
    sku,
    description,
    price,
    qty,
    model,
    models,
    reorderLevel,
    isSerialized,
    brandId,
    categoryId,
    image,
    reset,
    toPayload,
  ]);

  return <ItemStoreContext.Provider value={store}>{children}</ItemStoreContext.Provider>;
}

export function useItemStore() {
  const ctx = React.useContext(ItemStoreContext);
  if (!ctx) throw new Error("useItemStore must be used within ItemStoreProvider");
  return ctx;
}

export default ItemStoreProvider;
