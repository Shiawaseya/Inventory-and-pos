import React from "react";
import { useBrands } from "@/features/items/queries/useBrandQuery";
import { useFilterItemStore } from "@/features/items/store/filterItemStore";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const BrandList: React.FC = () => {
  const { brands } = useBrands();
  const selected = useFilterItemStore((s) => s.selectedBrands);
  const toggle = useFilterItemStore((s) => s.toggleBrand);

  if (!brands || brands.length === 0) return null;

  return (
    <div className="w-full">
      {/* Scrollable pill container with no scrollbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
        {brands.map((b) => {
          const isActive = selected.includes(b.name);

          return (
            <button
              key={b.name}
              type="button"
              onClick={() => toggle(b.name)}
              aria-pressed={isActive}
              className={cn(
                "group relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium tracking-tight transition-all duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                  : "border border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {/* Animated checkmark icon indicator */}
              <span
                className={cn(
                  "grid transition-all duration-200",
                  isActive
                    ? "grid-cols-[1fr] opacity-100"
                    : "grid-cols-[0fr] opacity-0",
                )}
              >
                <span className="overflow-hidden">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              </span>

              <span>{b.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BrandList;
