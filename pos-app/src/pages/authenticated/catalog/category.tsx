import { useState } from "react";
import { useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  User,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
} from "lucide-react";

export default function CategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = usePaginatedCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryRecord | null>(null);

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
        className="-ml-3 h-8 hover:bg-transparent font-semibold"
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
      header: "Category ID",
      className: "font-mono font-medium text-xs sm:text-sm w-[110px]",
      cell: (item) => `#${item.category_id}`,
    },
    {
      header: <SortableHeader title="Name" fieldKey="name" />,
      className: "font-semibold",
      cell: (item) => item.name,
    },
    {
      header: "Status",
      className: "w-[120px]",
      cell: (item) => (
        <Badge variant={item.is_active === false ? "secondary" : "default"}>
          {item.is_active === false ? "Inactive" : "Active"}
        </Badge>
      ),
    },
    {
      header: "Recorded By",
      cell: (item) =>
        item.recorded_by ? (
          <div className="flex items-center gap-1.5 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{item.recorded_by.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">System</span>
        ),
    },
    {
      header: <SortableHeader title="Created At" fieldKey="created_at" />,
      className: "text-muted-foreground text-xs",
      cell: (item) =>
        item.created_at ? new Date(item.created_at).toLocaleDateString() : "—",
    },
    {
      header: "Actions",
      headerClassName: "text-center w-[70px]",
      className: "text-center",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>

          <p className="mt-1 text-muted-foreground">
            Track product categories and assortment health.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>
      {/* Add Dialog */}
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
      {isError ? (
        <div className="p-4 border rounded-md text-destructive bg-destructive/10 text-sm">
          {error instanceof Error ? error.message : "Failed to load categories"}
        </div>
      ) : (
        <GenericDataTable
          title="Category List"
          columns={columns}
          data={data?.data ?? []}
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
          getRowKey={(item) => item.category_id}
        />
      )}
    </div>
  );
}
