import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import { socket } from "@/lib/socket";

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof itemsApi.create>[0]) => itemsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      if (socket.connected) {
        socket.emit("item_catalog_updated", {
          branchId: loginApi.getUser()?.branchId,
        });
      }
    },
  });
}
