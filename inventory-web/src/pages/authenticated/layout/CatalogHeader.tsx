import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  X,
  RotateCcw,
  ArrowUpDown,
  Tag,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import useCategoryPicker from "@/features/items/hooks/useCategoryPicker";
import useBrandPicker from "@/features/items/hooks/useBrandPicker";

type CatalogHeaderProps = {
  onAddNew?: () => void;
};

export function CatalogHeader({ onAddNew }: CatalogHeaderProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active query parameters aligned with backend ItemRepository
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "name";
  const currentCategoryId = searchParams.get("category_id") || "all";
  const currentBrandId = searchParams.get("brand_id") || "all";

  // Load brand and category meta to resolve display names and dropdown options
  const { categories, isLoading: loadingCategories } = useCategoryPicker(null);
  const { brands, isLoading: loadingBrands } = useBrandPicker(null);

  // Search input state with debouncing
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    setLocalSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const trimmed = debouncedSearch.trim();

    if (trimmed) {
      if (next.get("search") !== trimmed) {
        next.set("search", trimmed);
        next.set("page", "1");
        setSearchParams(next, { replace: true });
      }
    } else if (next.has("search")) {
      next.delete("search");
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all" && value.trim() !== "") {
      next.set(key, value.trim());
    } else {
      next.delete(key);
    }
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const handleReset = () => {
    setLocalSearch("");
    const next = new URLSearchParams();
    next.set("page", "1");
    next.set("per_page", searchParams.get("per_page") || "12");
    setSearchParams(next, { replace: true });
  };

  const activeCategoryName =
    currentCategoryId !== "all"
      ? categories?.find((c) => String(c.id) === currentCategoryId)?.name
      : null;

  const activeBrandName =
    currentBrandId !== "all"
      ? brands?.find((b) => String(b.id) === currentBrandId)?.name
      : null;

  const hasActiveFilters =
    Boolean(currentSearch) ||
    currentCategoryId !== "all" ||
    currentBrandId !== "all" ||
    (currentSort !== "name" && currentSort !== "");

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-card p-3 sm:p-4 shadow-sm shadow-black/[0.02]">
      {/* Main Single-Row Responsive Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Search Input Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search products by name..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9.5 pr-8 h-10 bg-background/80 shadow-none rounded-xl border-border/70 focus-visible:ring-1 text-xs sm:text-sm"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setLocalSearch("");
                updateParam("search", null);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Filter & Action Controls Grid/Row */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="w-[calc(50%-4px)] sm:w-40">
            <Select
              value={currentCategoryId}
              onValueChange={(val) => updateParam("category_id", val)}
              disabled={loadingCategories}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 text-xs font-medium bg-background">
                <Layers className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent align="start" className="text-xs">
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id ?? cat.name} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Dropdown */}
          <div className="w-[calc(50%-4px)] sm:w-36">
            <Select
              value={currentBrandId}
              onValueChange={(val) => updateParam("brand_id", val)}
              disabled={loadingBrands}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 text-xs font-medium bg-background">
                <Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent align="start" className="text-xs">
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((brand) => (
                  <SelectItem
                    key={brand.id ?? brand.name}
                    value={String(brand.id)}
                  >
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Selector */}
          <div className="w-[calc(50%-4px)] sm:w-36">
            <Select
              value={currentSort}
              onValueChange={(val) => updateParam("sort", val)}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 text-xs font-medium bg-background">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end" className="text-xs">
                <SelectItem value="name">Name (A → Z)</SelectItem>
                <SelectItem value="-name">Name (Z → A)</SelectItem>
                <SelectItem value="brand">Brand (A → Z)</SelectItem>
                <SelectItem value="category">Category (A → Z)</SelectItem>
                <SelectItem value="-created_at">Newest First</SelectItem>
                <SelectItem value="created_at">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Group: Reset & Add Button */}
          <div className="flex items-center gap-2 w-[calc(50%-4px)] sm:w-auto justify-end">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground rounded-xl border-border/70 shadow-none"
                title="Reset all filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}

            {onAddNew && (
              <Button
                onClick={onAddNew}
                className="h-10 flex-1 sm:flex-initial gap-1.5 px-4 shadow-sm shadow-primary/20 rounded-xl font-medium text-xs shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/40 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Active:</span>
          </div>

          {currentSearch && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-lg font-normal text-[11px] py-0.5 pl-2 pr-1 shrink-0"
            >
              <span>Query: "{currentSearch}"</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setLocalSearch("");
                  updateParam("search", null);
                }}
                className="h-3.5 w-3.5 p-0 hover:bg-transparent"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </Badge>
          )}

          {activeCategoryName && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-lg font-normal text-[11px] py-0.5 pl-2 pr-1 shrink-0"
            >
              <span>{activeCategoryName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateParam("category_id", null)}
                className="h-3.5 w-3.5 p-0 hover:bg-transparent"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </Badge>
          )}

          {activeBrandName && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-lg font-normal text-[11px] py-0.5 pl-2 pr-1 shrink-0"
            >
              <span>{activeBrandName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateParam("brand_id", null)}
                className="h-3.5 w-3.5 p-0 hover:bg-transparent"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </Badge>
          )}

          {currentSort !== "name" && currentSort !== "" && (
            <Badge
              variant="outline"
              className="gap-1 rounded-lg font-normal text-[11px] py-0.5 pl-2 pr-1 shrink-0 border-border/80"
            >
              <span>Sort: {currentSort}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateParam("sort", "name")}
                className="h-3.5 w-3.5 p-0 hover:bg-transparent"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 text-[10px] text-muted-foreground hover:text-destructive px-1.5 ml-auto shrink-0"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

export default CatalogHeader;
