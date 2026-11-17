import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof itemsApi.create>[0]) => itemsApi.create(payload),
    onSuccess: () => qc.invalidateQueries(["items"] as any),
  });
}
