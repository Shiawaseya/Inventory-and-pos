import { useCallback, useMemo, useState } from "react";
import { useBrands } from "@/features/items/queries/useBrandQuery";

export function useBrandPicker(initialId?: number | null) {
  const { brands, isLoading, isError, refetch } = useBrands();
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ?? null,
  );

  const selected = useMemo(
    () => brands.find((b) => (b.id ?? b.brand_id) === selectedId) ?? null,
    [brands, selectedId],
  );

  const selectById = useCallback((id?: number | null) => {
    setSelectedId(id ?? null);
  }, []);

  const selectByName = useCallback(
    (name: string) => {
      const b =
        brands.find((x) => x.name.toLowerCase() === name.toLowerCase()) ?? null;
      setSelectedId(b ? (b.id ?? b.brand_id) : null);
    },
    [brands],
  );

  const reset = useCallback(() => setSelectedId(null), []);

  return {
    brands,
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

export default useBrandPicker;
