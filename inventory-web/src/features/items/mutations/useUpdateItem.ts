import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import { socket } from "@/lib/socket";

export function useUpdateItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      itemsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      if (socket.connected) {
        socket.emit("item_catalog_updated", {
          branchId: loginApi.getUser()?.branchId,
          itemId: variables.id,
        });
      }
    },
  });
}

export default useUpdateItem;
