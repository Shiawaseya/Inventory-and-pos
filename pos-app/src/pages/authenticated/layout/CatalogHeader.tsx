import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Grid3x3, List, Plus, Search, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFilterItemStore } from "@/features/items/store/filterItemStore";
import { CategoryList } from "@/features/items/components/CategoryList";
import { BrandList } from "@/features/items/components/BrandList";
import { useDebounce } from "@/hooks/use-debounce";
import { Separator } from "@/components/ui/separator";

type CatalogHeaderProps = {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onAddNew?: () => void;
};

export function CatalogHeader({
  viewMode,
  onViewModeChange,
  onAddNew,
}: CatalogHeaderProps) {
  const { searchQuery, setSearchQuery, resetFilters } = useFilterItemStore();

  // Local state for snappy typing UI
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync debounced value to global store to trigger filtering
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Handle manual reset of local state
  const handleReset = () => {
    setLocalSearch("");
    resetFilters();
  };

  return (
    <div className="flex flex-col gap-4 ">
      {/* Primary Control Row */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Search Input - Main Focus */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-11 bg-background shadow-sm rounded-xl border-muted-foreground/20 focus-visible:ring-1"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocalSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Action Group: View Switcher, Reset, and Add New */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(v) => onViewModeChange(v as "grid" | "list")}
            >
              <TabsList className="h-11 px-1 bg-muted/50 border">
                <TabsTrigger
                  value="grid"
                  className="h-9 w-9 p-0 data-[state=active]:shadow-sm"
                >
                  <Grid3x3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="h-9 w-9 p-0 data-[state=active]:shadow-sm"
                >
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              className="h-11 w-11 text-muted-foreground hover:text-foreground border shadow-sm"
              title="Reset all filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <Separator
            orientation="vertical"
            className="hidden md:block h-8 mx-1"
          />

          {onAddNew && (
            <Button
              onClick={onAddNew}
              className="h-11 gap-2 px-5 shadow-md rounded-xl font-medium shrink-0"
            >
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Row - Categories and Brands */}
      <div className="flex flex-col gap-2 py-3 border-y border-border/40 bg-muted/5 rounded-lg px-2">
        {/* Category Row */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded shadow-sm border">
              Categories
            </span>
          </div>
          <CategoryList />
        </div>

        {/* Brand Row */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded shadow-sm border">
              Brands
            </span>
          </div>
          <BrandList />
        </div>
      </div>
    </div>
  );
}
