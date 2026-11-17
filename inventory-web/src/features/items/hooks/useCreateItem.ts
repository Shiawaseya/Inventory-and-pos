import { useCallback } from "react";
import { useCreateItem as useCreateItemMutation } from "@/features/items/mutations/useItem";
import { useItemStore } from "@/features/items/store/itemStore";
import { toast } from "sonner";

export function useCreateItem() {
  const mutation = useCreateItemMutation();
  const { name, model, models, isSerialized, brandId, categoryId, image } = useItemStore();

  const create = useCallback(async (overrides?: { brand_id?: number; category_id?: number }) => {
    const payload = {
      name: String(name ?? "").trim(),
      brand_id: overrides?.brand_id ?? brandId ?? undefined,
      model: model?.trim() || undefined,
      models: models && models.length > 0 ? models : undefined,
      category_id: overrides?.category_id ?? categoryId ?? undefined,
      is_serialized: isSerialized ? 1 : 0,
    } as const;

    const form = new FormData();
    form.append("name", String(payload.name));
    if (payload.brand_id != null) form.append("brand_id", String(payload.brand_id));
    if (payload.model != null) form.append("model", String(payload.model));
    if (payload.models && Array.isArray(payload.models)) {
      for (const m of payload.models) form.append("models[]", String(m));
    }
    if (payload.category_id != null) form.append("category_id", String(payload.category_id));
    form.append("is_serialized", String(payload.is_serialized));
    if (image) form.append("image", image);

    return mutation.mutateAsync(form as any);
  }, [mutation, name, model, isSerialized, brandId, categoryId]);

  const submit = useCallback(async (opts?: { onCreate?: (payload: any) => Promise<any> | any; onSuccess?: () => void }) => {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) {
      toast.error("Item name is required");
      throw new Error("Item name is required");
    }

    const payload = {
      name: trimmed,
      brand_id: brandId ?? undefined,
      model: model?.trim() || undefined,
      models: models && models.length > 0 ? models : undefined,
      category_id: categoryId ?? undefined,
      is_serialized: isSerialized ? 1 : 0,
    } as const;

    if (opts?.onCreate) {
      const res = await opts.onCreate(payload as any);
      // opts.onCreate may handle image upload
      toast.success("Item created");
      opts?.onSuccess?.();
      return res;
    }

    const form = new FormData();
    form.append("name", String(payload.name));
    if (payload.brand_id != null) form.append("brand_id", String(payload.brand_id));
    if (payload.model != null) form.append("model", String(payload.model));
    if (payload.models && Array.isArray(payload.models)) {
      for (const m of payload.models) form.append("models[]", String(m));
    }
    if (payload.category_id != null) form.append("category_id", String(payload.category_id));
    form.append("is_serialized", String(payload.is_serialized));
    if (image) form.append("image", image);

    const res = await mutation.mutateAsync(form as any);
    if (!res || (res as any).success === false) {
      const msg = (res as any).message || "Failed to create item";
      toast.error(msg);
      throw new Error(msg);
    }



    toast.success((res as any).message || "Item created");
    opts?.onSuccess?.();
    return res;
  }, [mutation, name, model, isSerialized, brandId, categoryId, image]);

  const isLoading = mutation.status === "pending";

  return { mutation, create, submit, isLoading } as const;
}

export default useCreateItem;
