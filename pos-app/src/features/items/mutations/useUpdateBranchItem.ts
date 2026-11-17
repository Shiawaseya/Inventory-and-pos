import { useMutation, useQueryClient } from "@tanstack/react-query";
import { branchInventoryItemApi } from "@/features/items/api/branchInventoryItemApi";

export function useUpdateBranchItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      branchInventoryItemApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries(["branch-inventory-serialized"] as any);
      qc.invalidateQueries(["branch-items"] as any);
      qc.invalidateQueries(["items"] as any);
    },
  });
}

export default useUpdateBranchItem;
