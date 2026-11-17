import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  categoriesApi,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
} from "../api/categoriesApi";
import { CATEGORY_QUERY_KEY } from "../queries/useCategory";

export function useCategory() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateCategoryRequest) =>
      categoriesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_QUERY_KEY] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateCategoryRequest;
    }) => categoriesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORY_QUERY_KEY] });
    },
  });

  return {
    ...createMutation,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
