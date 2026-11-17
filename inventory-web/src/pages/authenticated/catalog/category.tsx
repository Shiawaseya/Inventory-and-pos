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
import { CategoryDialog } from "@/features/items/components/CategoryDialog";
import { EditCategoryDialog } from "@/features/items/components/EditCategoryDialog";
import { usePaginatedCategories } from "@/features/items/queries/useCategory";
import { type CategoryRecord } from "@/features/items/api/categoriesApi";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Pencil,
  Search,
  RotateCcw,
  AlertCircle,
  FolderTree,
  Calendar,
  X,
} from "lucide-react";

export default function CategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = usePaginatedCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryRecord | null>(null);

  // Sync search input state with URL parameter `?search=`
  const currentSearchParam = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(currentSearchParam);
  const [, startTransition] = useTransition();

  // Keep local input in sync if URL changes externally (e.g., Back/Forward navigation)
  useEffect(() => {
    setSearchTerm(currentSearchParam);
  }, [currentSearchParam]);

  // Debounced URL updates when typing
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

  const handleEdit = (category: CategoryRecord) => {
    setSelectedCategory(category);
    setEditOpen(true);
  };

  const currentSort = searchParams.get("sort") || "";

  const handleSort = (fieldKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const activeSort = next.get("sort");

      if (activeSort === fieldKey) {
        next.set("sort", `-${fieldKey}`);
      } else if (activeSort === `-${fieldKey}`) {
        next.delete("sort");
      } else {
        next.set("sort", fieldKey);
      }

      next.set("page", "1");
      return next;
    });
  };

  // Client-side quick filter fallback
  const filteredCategories = useMemo(() => {
    const list = data?.data ?? [];
    const activeFilter = currentSearchParam.trim().toLowerCase();
    if (!activeFilter) return list;

    return list.filter(
      (cat) =>
        cat.name.toLowerCase().includes(activeFilter) ||
        cat.recorded_by?.name?.toLowerCase().includes(activeFilter),
    );
  }, [data?.data, currentSearchParam]);

  const SortableHeader = ({
    title,
    fieldKey,
  }: {
    title: string;
    fieldKey: string;
  }) => {
    const isAsc = currentSort === fieldKey;
    const isDesc = currentSort === `-${fieldKey}`;

    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-semibold hover:bg-transparent hover:text-foreground"
        onClick={() => handleSort(fieldKey)}
      >
        <span>{title}</span>
        {isAsc ? (
          <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
        ) : isDesc ? (
          <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
        )}
      </Button>
    );
  };

  const columns: ColumnDef<CategoryRecord>[] = [
    {
      header: <SortableHeader title="Category Name" fieldKey="name" />,
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
      cell: (item) => {
        const isActive = item.is_active !== false;
        return (
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-emerald-400" : "bg-muted-foreground"
              }`}
            />
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
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
      header: <SortableHeader title="Created At" fieldKey="created_at" />,
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
          <span className="sr-only">Edit Category</span>
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
            <FolderTree className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Categories
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track product categories and assortment health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Reload categories"
          >
            <RotateCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button onClick={handleCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* URL-bound Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search categories or recorder..."
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

      {/* Create Dialog */}
      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={() => refetch()}
      />

      {/* Edit Dialog */}
      <EditCategoryDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={() => refetch()}
      />

      {/* Main Table / Error Handling */}
      {isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            {error instanceof Error
              ? error.message
              : "Failed to load categories"}
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
          title="Category List"
          columns={columns}
          data={filteredCategories}
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
