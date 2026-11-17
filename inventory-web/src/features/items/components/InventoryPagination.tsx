import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationMeta } from "@/features/items/api/branchInventoryItemApi";

export function InventoryPagination({
  pagination,
}: {
  pagination?: PaginationMeta;
}) {
  const [, setSearchParams] = useSearchParams();

  if (!pagination || pagination.total_pages <= 1) return null;

  const { current_page, total_pages, total_items, per_page } = pagination;

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(newPage));
      return next;
    });
  };

  const startIdx = (current_page - 1) * per_page + 1;
  const endIdx = Math.min(current_page * per_page, total_items);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-background/50">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
        <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
        <span className="font-semibold text-foreground">{total_items}</span>{" "}
        items
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(1)}
          disabled={current_page <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(current_page - 1)}
          disabled={current_page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs px-3 font-medium">
          Page {current_page} of {total_pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(current_page + 1)}
          disabled={current_page >= total_pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(total_pages)}
          disabled={current_page >= total_pages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
