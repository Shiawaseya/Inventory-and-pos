import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";

export function useUpdateItemForm() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData | any }) =>
      itemsApi.updateForm(id, form),
    onSuccess: () => qc.invalidateQueries(["items"] as any),
  });
}

export default useUpdateItemForm;
