import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';

export type FilterItemConfig = {
  searchQuery: string;
  selectedCategories: string[];
  priceRange: [number, number];
  stockLevelMin: number;
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest';
};

type FilterItemProps = {
  onFilterChange?: (filters: FilterItemConfig) => void;
  availableCategories?: string[];
};

export const FilterItem = ({ onFilterChange, availableCategories = [] }: FilterItemProps) => {
  const [filters, setFilters] = useState<FilterItemConfig>({
    searchQuery: '',
    selectedCategories: [],
    priceRange: [0, 1000],
    stockLevelMin: 0,
    status: 'all',
    sortBy: 'name',
  });

  const [isOpen, setIsOpen] = useState(true);

  const handleSearchChange = (value: string) => {
    const updated = { ...filters, searchQuery: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleCategoryToggle = (category: string) => {
    const updated = {
      ...filters,
      selectedCategories: filters.selectedCategories.includes(category)
        ? filters.selectedCategories.filter(c => c !== category)
        : [...filters.selectedCategories, category],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: number) => {
    const updated = {
      ...filters,
      priceRange: type === 'min' ? [value, filters.priceRange[1]] : [filters.priceRange[0], value],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleStockLevelChange = (value: number) => {
    const updated = { ...filters, stockLevelMin: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleStatusChange = (value: 'all' | 'active' | 'inactive') => {
    const updated = { ...filters, status: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleSortChange = (value: string) => {
    const updated = { ...filters, sortBy: value as FilterItemConfig['sortBy'] };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Refine your search</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`}
            />
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 pt-0">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search</Label>
            <Input
              id="search"
              placeholder="Search by item name..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9"
            />
          </div>

          <Separator />

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start px-0 py-1 font-medium text-sm"
                >
                  <ChevronDown className="h-4 w-4 mr-2 transition-transform" />
                  Categories
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* Price Range */}
          <Collapsible defaultOpen className="space-y-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start px-0 py-1 font-medium text-sm"
              >
                <ChevronDown className="h-4 w-4 mr-2 transition-transform" />
                Price Range
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price-min" className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    id="price-min"
                    type="number"
                    min="0"
                    value={filters.priceRange[0]}
                    onChange={(e) => handlePriceRangeChange('min', Number(e.target.value))}
                    className="h-9 mt-1"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <Label htmlFor="price-max" className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    id="price-max"
                    type="number"
                    min="0"
                    value={filters.priceRange[1]}
                    onChange={(e) => handlePriceRangeChange('max', Number(e.target.value))}
                    className="h-9 mt-1"
                    placeholder="$1000"
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                ${filters.priceRange[0]} - ${filters.priceRange[1]}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Stock Level */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start px-0 py-1 font-medium text-sm"
              >
                <ChevronDown className="h-4 w-4 mr-2 transition-transform" />
                Stock Level
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <Input
                id="stock-level"
                type="number"
                min="0"
                value={filters.stockLevelMin}
                onChange={(e) => handleStockLevelChange(Number(e.target.value))}
                className="h-9"
                placeholder="0 units"
              />
              <div className="text-xs text-muted-foreground">
                Show items with at least {filters.stockLevelMin} units
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Status & Sort */}
          <Collapsible className="space-y-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start px-0 py-1 font-medium text-sm"
              >
                <ChevronDown className="h-4 w-4 mr-2 transition-transform" />
                Display Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select value={filters.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status" className="h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort" className="text-sm font-medium">Sort By</Label>
                <Select value={filters.sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger id="sort" className="h-9">
                    <SelectValue placeholder="Select sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                    <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Active Filters Badge */}
          {(filters.searchQuery || filters.selectedCategories.length > 0 || filters.status !== 'all' || filters.stockLevelMin > 0) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {filters.searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {filters.searchQuery}
                  </Badge>
                )}
                {filters.selectedCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {filters.status}
                  </Badge>
                )}
                {filters.stockLevelMin > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Stock ≥ {filters.stockLevelMin}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
