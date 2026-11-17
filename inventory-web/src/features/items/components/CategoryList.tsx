import React from "react";
import { useCategory } from "@/features/items/queries/useCategory";
import { Button } from "@/components/ui/button";
import { useFilterItemStore } from "@/features/items/store/filterItemStore";

// Apply this logic to both BrandList and CategoryList
export const CategoryList: React.FC = () => {
  const { categories } = useCategory();
  const selected = useFilterItemStore((s) => s.selectedCategories);
  const toggle = useFilterItemStore((s) => s.toggleCategory);

  if (!categories?.length) return null;

  return (
    <div className="flex gap-1.5">
      {categories.map((c) => {
        const isActive = selected.includes(c.name);
        return (
          <button
            key={c.id ?? c.name}
            onClick={() => toggle(c.name)}
            className={`
              whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }
            `}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
};
