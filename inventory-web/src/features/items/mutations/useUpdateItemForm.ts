import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/features/items/api/itemsApi";
import { loginApi } from "@/features/authentications/api/loginApi";
import { socket } from "@/lib/socket";

export function useUpdateItemForm() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData | any }) =>
      itemsApi.updateForm(id, form),
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

export default useUpdateItemForm;
