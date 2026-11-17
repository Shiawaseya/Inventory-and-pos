import React, { useCallback, useMemo, useState } from "react";

export type InsertedSerials = {
  variantId: number;
  serials: string[];
};

type InsertStockUnitStore = {
  entries: Record<number, string[]>;
  addSerial: (variantId: number, serial: string) => void;
  removeSerial: (variantId: number, serial: string) => void;
  setSerials: (variantId: number, serials: string[]) => void;
  clearItem: (variantId: number) => void;
  clearAll: () => void;
};

const InsertStockUnitContext = React.createContext<InsertStockUnitStore | null>(null);

export function InsertStockUnitProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<number, string[]>>({});

  const addSerial = useCallback((variantId: number, serial: string) => {
    setEntries((prev) => {
      const arr = prev[variantId] ? [...prev[variantId]] : [];
      if (!arr.includes(serial)) arr.push(serial);
      return { ...prev, [variantId]: arr };
    });
  }, []);

  const removeSerial = useCallback((variantId: number, serial: string) => {
    setEntries((prev) => {
      const arr = (prev[variantId] || []).filter((s) => s !== serial);
      const next = { ...prev, [variantId]: arr };
      if (arr.length === 0) delete next[variantId];
      return next;
    });
  }, []);

  const setSerials = useCallback((variantId: number, serials: string[]) => {
    setEntries((prev) => ({ ...prev, [variantId]: [...serials] }));
  }, []);

  const clearItem = useCallback((variantId: number) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setEntries({}), []);

  const value = useMemo(() => ({ entries, addSerial, removeSerial, setSerials, clearItem, clearAll }), [entries, addSerial, removeSerial, setSerials, clearItem, clearAll]);

  return <InsertStockUnitContext.Provider value={value}>{children}</InsertStockUnitContext.Provider>;
}

export function useInsertStockUnitStore() {
  const ctx = React.useContext(InsertStockUnitContext);
  if (!ctx) throw new Error("useInsertStockUnitStore must be used within InsertStockUnitProvider");
  return ctx;
}

export default InsertStockUnitProvider;
