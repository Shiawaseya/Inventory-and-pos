import { Package, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  isSpecActive,
  stockCheckerApi,
  type SpecFilterState,
  type StockSearchParams,
  type StockVariant,
} from "@/features/pos/api/stockCheckerApi";
import { SpecFilters } from "@/features/pos/components/SpecFilters";
import { VariantDetailDialog } from "@/features/pos/components/VariantDetailDialog";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function StockCheckerPage() {
  const branchId = Number(loginApi.getUser()?.branchId ?? 0);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] =
    useState<NonNullable<StockSearchParams["sort"]>>("name");
  const [specs, setSpecs] = useState<Record<number, SpecFilterState>>({});
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<StockVariant | null>(null);

  const dSearch = useDebounced(search);
  const dPriceMin = useDebounced(priceMin);
  const dPriceMax = useDebounced(priceMax);
  const dSpecs = useDebounced(specs);

  useEffect(
    () => setPage(1),
    [dSearch, categoryId, dPriceMin, dPriceMax, inStock, sort, dSpecs],
  );

  const changeCategory = (id?: number) => {
    setCategoryId(id);
    setSpecs({});
  };

  const facetsQuery = useQuery({
    queryKey: ["stock-facets", branchId, categoryId],
    queryFn: () => stockCheckerApi.facets(branchId, categoryId),
    enabled: branchId > 0,
    refetchOnWindowFocus: false,
  });

  const variantsQuery = useQuery({
    queryKey: [
      "stock-variants",
      branchId,
      dSearch,
      categoryId,
      dPriceMin,
      dPriceMax,
      inStock,
      sort,
      dSpecs,
      page,
    ],
    queryFn: () =>
      stockCheckerApi.variants({
        branchId,
        search: dSearch,
        categoryId,
        priceMin: dPriceMin,
        priceMax: dPriceMax,
        inStock,
        sort,
        specs: dSpecs,
        page,
      }),
    enabled: branchId > 0,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const facets = facetsQuery.data;
  const variants = variantsQuery.data?.data ?? [];
  const pagination = variantsQuery.data?.pagination;

  const activeSpecCount = useMemo(
    () => Object.values(specs).filter(isSpecActive).length,
    [specs],
  );
  const activeCount =
    activeSpecCount +
    (priceMin || priceMax ? 1 : 0) +
    (inStock ? 1 : 0) +
    (categoryId ? 1 : 0);

  const clearAll = () => {
    setSpecs({});
    setPriceMin("");
    setPriceMax("");
    setInStock(false);
    setCategoryId(undefined);
  };

  const filterPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 pb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filter Options
        </span>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X size={12} className="mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Independently scrollable filter stack */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto py-3 pr-1 text-xs">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              changeCategory(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All categories</option>
            {facets?.categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name} ({c.variant_count})
              </option>
            ))}
          </select>
          {!categoryId && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Select category for attribute specs.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Price Range
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={priceMin}
              placeholder={facets ? String(facets.price.min) : "Min"}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-7 text-xs bg-background"
            />
            <span className="text-[11px] text-muted-foreground">to</span>
            <Input
              type="number"
              value={priceMax}
              placeholder={facets ? String(facets.price.max) : "Max"}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-7 text-xs bg-background"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="size-3.5 accent-primary rounded"
          />
          In stock only
        </label>

        <div className="border-t border-border/60 pt-3">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Specifications
          </p>
          {facetsQuery.isLoading ? (
            <p className="text-[11px] text-muted-foreground">
              Loading filters…
            </p>
          ) : (
            <SpecFilters
              attributes={facets?.attributes ?? []}
              value={specs}
              onChange={setSpecs}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Pinned Top Bar */}
      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Stock & Price Checker
          </h1>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {variantsQuery.isFetching
              ? "Updating…"
              : `${pagination?.total_items ?? 0} variants`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <PackageSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, serial, or model..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 lg:hidden"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal size={13} />
            {activeCount ? `(${activeCount})` : ""}
          </Button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="stock_desc">Most stock</option>
          </select>
        </div>
      </div>

      {/* Main Workspace (Split Grid + Scrollable Filter Sidebar) */}
      <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[250px_1fr]">
        <aside
          className={`h-full min-h-0 rounded-xl border border-border bg-card p-3 shadow-xs lg:block ${
            filtersOpen ? "block" : "hidden"
          }`}
        >
          {filterPanel}
        </aside>

        {/* Scrollable Content Section */}
        <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-2.5 sm:p-3 shadow-xs">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {!branchId ? (
              <Empty text="No branch is assigned to this account." />
            ) : variantsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[184px] animate-pulse rounded-lg border border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : variantsQuery.isError ? (
              <Empty
                text={
                  (variantsQuery.error as Error).message ||
                  "Unable to load variants."
                }
                error
              />
            ) : variants.length === 0 ? (
              <Empty text="No variants match these filters." />
            ) : (
              <div
                className={`grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
                  variantsQuery.isFetching ? "opacity-60" : ""
                }`}
              >
                {variants.map((v) => (
                  <VariantCard
                    key={v.variant_id}
                    variant={v}
                    onSelect={() => setSelected(v)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="shrink-0 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>

      <VariantDetailDialog
        variant={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function Empty({ text, error }: { text: string; error?: boolean }) {
  return (
    <div
      className={`grid h-full place-items-center p-8 text-center text-xs ${
        error ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

function VariantCard({
  variant: v,
  onSelect,
}: {
  variant: StockVariant;
  onSelect: () => void;
}) {
  const out = v.available_count <= 0;
  const shown = v.specs.slice(0, 2);
  const more = v.specs.length - shown.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-[184px] w-full flex-col overflow-hidden rounded-lg border border-border bg-card p-2.5 text-left shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex shrink-0 items-start gap-2.5">
        {v.image_url ? (
          <img
            src={v.image_url}
            alt=""
            className="size-10 shrink-0 rounded-md border border-border/50 object-cover"
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-md border border-border/60 bg-muted/50 text-primary">
            <Package size={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
            {v.item_name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {v.model || "Default"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex shrink-0 items-baseline justify-between">
        <span className="text-base font-bold text-foreground">
          {peso(v.price)}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
            out
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : v.available_count <= 3
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
          }`}
        >
          {out ? "Out of stock" : `${v.available_count} left`}
        </span>
      </div>

      {/* flex-1 keeps the card height fixed whether or not there are specs */}
      <div className="mt-2 min-h-0 flex-1 overflow-hidden border-t border-border/40 pt-2 text-[10px]">
        {shown.length > 0 ? (
          <dl className="space-y-0.5">
            {shown.map((s) => (
              <div key={s.attribute_id} className="flex justify-between gap-2">
                <dt className="truncate text-muted-foreground">{s.name}</dt>
                <dd className="truncate text-right font-medium text-foreground">
                  {s.value}
                  {s.unit ? ` ${s.unit}` : ""}
                </dd>
              </div>
            ))}
            {more > 0 && (
              <p className="text-[9px] text-primary">
                +{more} more · view details
              </p>
            )}
          </dl>
        ) : (
          <p className="text-[10px] text-muted-foreground">No specifications</p>
        )}
      </div>

      <p className="mt-1.5 shrink-0 truncate border-t border-border/30 pt-1.5 text-[10px] text-muted-foreground">
        {[v.sku && `SKU ${v.sku}`, v.brand, v.category]
          .filter(Boolean)
          .join(" · ")}
        {v.is_serialized ? " · Serial" : ""}
      </p>
    </button>
  );
}
