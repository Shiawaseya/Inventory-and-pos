import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  stockUnitApi,
  type CreateStockUnitPayload,
} from "@/features/items/api/stockUnitApi";

export function useStockUnit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockUnitPayload) => stockUnitApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stock-units"] });
      void qc.invalidateQueries({ queryKey: ["branch-inventory-serialized"] });
      void qc.invalidateQueries({ queryKey: ["checkout-inventory"] });
      void qc.invalidateQueries({ queryKey: ["branch-items"] });
    },
  });
}

export default useStockUnit;
