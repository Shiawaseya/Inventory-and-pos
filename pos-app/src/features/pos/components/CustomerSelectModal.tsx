import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Customer } from "../types/pos.types";

const PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const FILTER_FIELDS = [
  { key: "city_municipality", label: "City / Municipality" },
  { key: "province", label: "Province" },
  { key: "barangay", label: "Barangay" },
  { key: "contact_number", label: "Contact number" },
  { key: "email_address", label: "Email" },
  { key: "tin", label: "TIN" },
  { key: "business_style", label: "Business style" },
] as const;

type FilterKey = (typeof FILTER_FIELDS)[number]["key"];
type Filters = Record<FilterKey, string>;

const EMPTY_FILTERS: Filters = {
  city_municipality: "",
  province: "",
  barangay: "",
  contact_number: "",
  email_address: "",
  tin: "",
  business_style: "",
};

/** Query params sent to GET /customers. */
export type CustomerQuery = {
  page: number;
  per_page: number;
  search?: string;
} & Partial<Record<FilterKey, string>>;

/** Shape of the GET /customers response (only the parts the modal uses). */
export type CustomerPage = {
  data: Customer[];
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
};

type CustomerRow = Customer & {
  middle_name?: string | null;
  email_address?: string | null;
  tin?: string | null;
  business_style?: string | null;
  address?: {
    barangay?: string | null;
    city_municipality?: string | null;
    province?: string | null;
  } | null;
};

export const customerFullName = (customer: Customer) => {
  const c = customer as CustomerRow;
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10";

type CustomerSelectModalProps = {
  open: boolean;
  selected: Customer | null;
  loadCustomers: (query: CustomerQuery) => Promise<CustomerPage>;
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
  onAddCustomer: () => void;
};

export function CustomerSelectModal({
  open,
  ...props
}: CustomerSelectModalProps) {
  if (!open) return null;
  // Mounted only while open, so search/filters/page reset and data refreshes
  // every time the modal opens (e.g. after adding a new customer).
  return createPortal(<ModalBody {...props} />, document.body);
}

function ModalBody({
  selected,
  loadCustomers,
  onSelect,
  onClose,
  onAddCustomer,
}: Omit<CustomerSelectModalProps, "open">) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [criteria, setCriteria] = useState({
    search: "",
    filters: EMPTY_FILTERS,
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CustomerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const requestId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef(loadCustomers);
  loadRef.current = loadCustomers;

  const activeFilterCount = FILTER_FIELDS.filter(
    ({ key }) => filters[key].trim() !== "",
  ).length;

  // Focus search, close on Escape, lock background scroll.
  useEffect(() => {
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Debounce typing, and go back to page 1 whenever search/filters change.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCriteria((prev) =>
        prev.search === search && prev.filters === filters
          ? prev
          : { search, filters },
      );
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search, filters]);

  // Fetch from the API (server-side search, filters, pagination).
  useEffect(() => {
    const id = ++requestId.current;
    const query: CustomerQuery = { page, per_page: PER_PAGE };
    if (criteria.search.trim()) query.search = criteria.search.trim();
    for (const { key } of FILTER_FIELDS) {
      const value = criteria.filters[key].trim();
      if (value) query[key] = value;
    }

    setLoading(true);
    setError(null);
    loadRef
      .current(query)
      .then((res) => {
        if (id === requestId.current) setResult(res);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load customers",
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [page, criteria, reloadKey]);

  const customers = result?.data ?? [];
  const pagination = result?.pagination;
  const hasCriteria = search.trim() !== "" || activeFilterCount > 0;

  const clearAll = () => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  };

  const choose = (customer: Customer | null) => {
    onSelect(customer);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-select-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users size={16} />
            </span>
            <h2
              id="customer-select-title"
              className="text-sm font-semibold text-foreground"
            >
              Select customer
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search + filter toggle */}
        <div className="shrink-0 space-y-2 px-4 pb-3">
          <div className="flex gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, contact, email, city, province…"
                aria-label="Search customers"
                className={cn(inputClass, "h-10 pl-8")}
              />
            </div>
            <Button
              type="button"
              variant={
                showFilters || activeFilterCount ? "secondary" : "outline"
              }
              className="h-10 gap-1.5 rounded-lg px-3 text-xs"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((value) => !value)}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-2">
                {FILTER_FIELDS.map(({ key, label }) => (
                  <label key={key} className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {label}
                    </span>
                    <input
                      type="text"
                      value={filters[key]}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="min-h-[16rem] flex-1 overflow-y-auto border-t border-border px-3 py-2">
          {loading && !result ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                Couldn't load customers
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Try again
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users size={22} />
              </span>
              <p className="text-sm font-semibold text-foreground">
                No customers found
              </p>
              <p className="text-xs text-muted-foreground">
                {hasCriteria
                  ? "Try a different search or clear the filters."
                  : "Add your first customer to get started."}
              </p>
              {hasCriteria && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                >
                  Clear search & filters
                </Button>
              )}
            </div>
          ) : (
            <ul className={cn(loading && "opacity-60 transition-opacity")}>
              {customers.map((customer) => {
                const row = customer as CustomerRow;
                const isSelected =
                  selected?.customer_id != null &&
                  selected.customer_id === customer.customer_id;
                const location = [
                  row.address?.barangay,
                  row.address?.city_municipality,
                  row.address?.province,
                ]
                  .filter(Boolean)
                  .join(", ");
                const contact = [row.contact_number, row.email_address]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={customer.customer_id ?? customerFullName(customer)}>
                    <button
                      type="button"
                      onClick={() => choose(customer)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected && "bg-primary/10",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                        {(row.first_name?.[0] ?? "") +
                          (row.last_name?.[0] ?? "")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {customerFullName(customer)}
                          </span>
                          {row.business_style && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              {row.business_style}
                            </span>
                          )}
                        </span>
                        {contact && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {contact}
                          </span>
                        )}
                        {(location || row.tin) && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {[location, row.tin ? `TIN ${row.tin}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check size={16} className="shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer: pagination + add */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-dashed border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              aria-label="Previous page"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              aria-label="Next page"
              disabled={
                loading || !pagination || page >= pagination.total_pages
              }
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </Button>
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              {pagination
                ? `Page ${pagination.current_page} of ${Math.max(
                    pagination.total_pages,
                    1,
                  )} · ${pagination.total_items} ${
                    pagination.total_items === 1 ? "customer" : "customers"
                  }`
                : "—"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
            onClick={onAddCustomer}
          >
            <Plus size={14} />
            New customer
          </Button>
        </div>
      </div>
    </div>
  );
}
