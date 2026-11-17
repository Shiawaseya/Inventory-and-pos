import { useCallback, useMemo, useState } from "react";
import { useCategory } from "@/features/items/queries/useCategory";

export function useCategoryPicker(initialId?: number | null) {
  const { categories, isLoading, isError, refetch } = useCategory();
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);

  const selected = useMemo(() => categories?.find((c) => c.id === selectedId) ?? null, [categories, selectedId]);

  const selectById = useCallback((id?: number | null) => {
    setSelectedId(id ?? null);
  }, []);

  const selectByName = useCallback((name: string) => {
    const c = categories?.find((x) => x.name === name) ?? null;
    setSelectedId(c?.id ?? null);
  }, [categories]);

  const reset = useCallback(() => setSelectedId(null), []);

  return {
    categories,
    isLoading,
    isError,
    refetch,
    selectedId,
    selected,
    selectById,
    selectByName,
    setSelectedId,
    reset,
  } as const;
}

export default useCategoryPicker;
