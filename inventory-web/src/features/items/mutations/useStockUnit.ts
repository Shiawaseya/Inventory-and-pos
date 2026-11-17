import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stockUnitApi, type CreateStockUnitPayload} from "@/features/items/api/stockUnitApi";

export function useStockUnit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockUnitPayload) => stockUnitApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-inventory-serialized"] });
      qc.invalidateQueries({ queryKey: ["branch-items"] });
    },
  });
}

export default useStockUnit;
