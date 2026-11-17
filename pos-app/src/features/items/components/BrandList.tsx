import React from "react";
import { useBrands } from "@/features/items/queries/useBrandQuery";
import { Button } from "@/components/ui/button";
import { useFilterItemStore } from "@/features/items/store/filterItemStore";

export const BrandList: React.FC = () => {
  const { brands } = useBrands();
  const selected = useFilterItemStore((s) => s.selectedBrands);
  const toggle = useFilterItemStore((s) => s.toggleBrand);

  if (!brands || brands.length === 0) return null;

  return (
    <div className="flex gap-1.5">
      {brands.map((b) => {
        const isActive = selected.includes(b.name);
        return (
          <button
            key={b.id ?? b.name}
            onClick={() => toggle(b.name)}
            className={`
              whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }
            `}
          >
            {b.name}
          </button>
        );
      })}
    </div>
  );
};

export default BrandList;
