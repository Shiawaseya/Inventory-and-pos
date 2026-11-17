import { useMutation, useQueryClient } from "@tanstack/react-query";
import { branchItemApi } from "@/features/items/api/branchItemApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import { socket } from "@/lib/socket";

export function useBranchItemMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof branchItemApi.set>[0]) => branchItemApi.set(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["branch-items"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["branch-inventory-serialized"] });
      if (socket.connected) {
        socket.emit("branch_inventory_updated", {
          branchId: loginApi.getUser()?.branchId,
          itemId: variables.item_id,
          variantId: variables.variant_id,
        });
      }
    },
  });
}

export default useBranchItemMutation;
