import { useMutation, useQueryClient } from "@tanstack/react-query";
import { branchItemApi } from "@/features/items/api/branchItemApi";

export function useBranchItemMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof branchItemApi.set>[0]) => branchItemApi.set(payload),
    onSuccess: () => {
      qc.invalidateQueries(["branch-items"] as any);
      qc.invalidateQueries(["items"] as any);
    },
  });
}

export default useBranchItemMutation;
