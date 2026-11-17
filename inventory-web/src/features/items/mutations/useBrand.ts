import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  brandsApi,
  type CreateBrandRequest,
  type UpdateBrandRequest,
} from "../api/brandsApi";
import { BRAND_QUERY_KEY } from "../queries/useBrandQuery";

export function useBrand() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateBrandRequest) => brandsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BRAND_QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateBrandRequest;
    }) => brandsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BRAND_QUERY_KEY] });
    },
  });

  return {
    ...createMutation,
    createBrand: createMutation.mutateAsync,
    updateBrand: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
