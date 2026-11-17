import { useMutation, useQueryClient } from "@tanstack/react-query";
import { branchInventoryItemApi } from "@/features/items/api/branchInventoryItemApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import { socket } from "@/lib/socket";

export function useUpdateBranchItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      branchInventoryItemApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["branch-inventory-serialized"] });
      qc.invalidateQueries({ queryKey: ["branch-items"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      if (socket.connected) {
        socket.emit("branch_inventory_updated", {
          branchId: loginApi.getUser()?.branchId,
          branchItemId: variables.id,
        });
      }
    },
  });
}

export default useUpdateBranchItem;
