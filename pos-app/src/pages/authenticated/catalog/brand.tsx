import { useState } from "react";
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
import { BrandDialog } from "@/features/items/components/BrandDialog";
import { EditBrandDialog } from "@/features/items/components/EditBrandDialog";
import { usePaginatedBrands } from "@/features/items/queries/useBrandQuery";
import { type BrandRecord } from "@/features/items/api/brandsApi";
import { MoreHorizontal, Pencil, User, Plus } from "lucide-react";

export default function BrandPage() {
  const { data, isLoading, isError, error, refetch } = usePaginatedBrands();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandRecord | null>(null);

  const handleCreate = () => {
    setCreateOpen(true);
  };

  const handleEdit = (brand: BrandRecord) => {
    setSelectedBrand(brand);
    setEditOpen(true);
  };

  const columns: ColumnDef<BrandRecord>[] = [
    {
      header: "Brand ID",
      className: "font-mono font-medium text-xs sm:text-sm w-[100px]",
      cell: (item) => `#${item.brand_id}`,
    },
    {
      header: "Brand Name",
      className: "font-semibold",
      cell: (item) => item.name,
    },
    {
      header: "Status",
      className: "w-[120px]",
      cell: (item) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Active" : "Inactive"}
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
      header: "Created At",
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
              Edit Brand
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
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="mt-1 text-muted-foreground">
            Manage catalog brands and manufacturer details.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

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

      {isError ? (
        <div className="p-4 border rounded-md text-destructive bg-destructive/10 text-sm">
          {error instanceof Error ? error.message : "Failed to load brands"}
        </div>
      ) : (
        <GenericDataTable
          title="Brand List"
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
          getRowKey={(item) => item.brand_id}
        />
      )}
    </div>
  );
}
