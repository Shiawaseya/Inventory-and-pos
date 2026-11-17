"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GenericDataTable,
  type ColumnDef,
} from "@/components/ui/generic-data-table";
import { BrandDialog } from "@/features/items/components/BrandDialog";
import { EditBrandDialog } from "@/features/items/components/EditBrandDialog";
import { usePaginatedBrands } from "@/features/items/queries/useBrandQuery";
import { type BrandRecord } from "@/features/items/api/brandsApi";
import {
  Pencil,
  Plus,
  Search,
  RotateCcw,
  AlertCircle,
  Tag,
  Calendar,
  X,
} from "lucide-react";

export default function BrandPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = usePaginatedBrands();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandRecord | null>(null);

  // Sync search input state with URL parameter `?search=`
  const currentSearchParam = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(currentSearchParam);
  const [, startTransition] = useTransition();

  // Keep input in sync if URL changes (e.g. Back/Forward navigation)
  useEffect(() => {
    setSearchTerm(currentSearchParam);
  }, [currentSearchParam]);

  // Debounce URL updates to avoid excessive state updates while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeSearch = searchParams.get("search") || "";
      const trimmed = searchTerm.trim();

      if (trimmed !== activeSearch) {
        startTransition(() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (trimmed) {
              next.set("search", trimmed);
            } else {
              next.delete("search");
            }
            next.set("page", "1");
            return next;
          });
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, setSearchParams]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("search");
      next.set("page", "1");
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = searchTerm.trim();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        return next;
      });
    }
  };

  const handleCreate = () => {
    setCreateOpen(true);
  };

  const handleEdit = (brand: BrandRecord) => {
    setSelectedBrand(brand);
    setEditOpen(true);
  };

  // Quick fallback filter over current page results
  const filteredBrands = useMemo(() => {
    const list = data?.data ?? [];
    const activeFilter = currentSearchParam.trim().toLowerCase();
    if (!activeFilter) return list;

    return list.filter(
      (brand) =>
        brand.name.toLowerCase().includes(activeFilter) ||
        brand.recorded_by?.name?.toLowerCase().includes(activeFilter),
    );
  }, [data?.data, currentSearchParam]);

  const columns: ColumnDef<BrandRecord>[] = [
    {
      header: "Brand Name",
      className: "min-w-[200px]",
      cell: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
            {item.name.slice(0, 2)}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {item.name}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      className: "w-[120px]",
      cell: (item) => (
        <Badge
          variant={item.is_active ? "default" : "secondary"}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              item.is_active ? "bg-emerald-400" : "bg-muted-foreground"
            }`}
          />
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Recorded By",
      className: "min-w-[150px]",
      cell: (item) =>
        item.recorded_by?.name ? (
          <div className="flex items-center gap-2 text-sm text-foreground/80">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-secondary-foreground">
              {item.recorded_by.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{item.recorded_by.name}</span>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">System</span>
        ),
    },
    {
      header: "Created At",
      className: "w-[140px] text-xs text-muted-foreground",
      cell: (item) =>
        item.created_at ? (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground/70" />
            <span>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        ) : (
          "—"
        ),
    },
    {
      header: "Actions",
      headerClassName: "text-right w-[70px]",
      className: "text-right",
      cell: (item) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted focus-visible:ring-1"
          onClick={() => handleEdit(item)}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Brand</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Brands
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage catalog brands, partner labels, and manufacturer details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Reload data"
          >
            <RotateCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button onClick={handleCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        </div>
      </div>

      {/* URL-bound Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search brands or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8 pr-8 text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BrandDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={() => refetch()}
      />

      <EditBrandDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedBrand(null);
        }}
        brand={selectedBrand}
        onSuccess={() => refetch()}
      />

      {/* Main Table / Error Handling */}
      {isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            {error instanceof Error ? error.message : "Failed to load brands"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-destructive/30 hover:bg-destructive/10"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <GenericDataTable
          title="Brand List"
          columns={columns}
          data={filteredBrands}
          pagination={
            data?.pagination ?? {
              current_page: 1,
              per_page: 10,
              total_pages: 1,
              total_items: 0,
            }
          }
          links={
            data?.links ?? {
              self: "",
              first: "",
              last: "",
              prev: null,
              next: null,
            }
          }
          isLoading={isLoading}
          getRowKey={(item) => item.name}
        />
      )}
    </div>
  );
}
