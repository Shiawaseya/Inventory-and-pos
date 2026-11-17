import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

type CatalogPaginationProps = {
  pagination?: PaginationMeta;
};

export function CatalogPagination({ pagination }: CatalogPaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (!pagination || pagination.total_items === 0) {
    return null;
  }

  const {
    current_page,
    per_page,
    total_items,
    total_pages,
    has_next,
    has_prev,
  } = pagination;

  const setPage = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(newPage));
    setSearchParams(nextParams, { replace: true });
  };

  const setPerPage = (newPerPage: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("per_page", newPerPage);
    nextParams.set("page", "1"); // Reset to page 1 on limit change
    setSearchParams(nextParams, { replace: true });
  };

  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total_items);

  // Generate numbered pages (e.g. 1, 2, 3...)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= total_pages; i++) {
      if (
        i === 1 ||
        i === total_pages ||
        (i >= current_page - delta && i <= current_page + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-border/60">
      {/* Left: Summary and Page Size */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{from}</strong> to{" "}
          <strong className="text-foreground">{to}</strong> of{" "}
          <strong className="text-foreground">{total_items}</strong> items
        </span>

        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <Select value={String(per_page)} onValueChange={setPerPage}>
            <SelectTrigger className="h-8 w-18 text-xs">
              <SelectValue placeholder={String(per_page)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(1)}
          disabled={!has_prev}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(current_page - 1)}
          disabled={!has_prev}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Number Buttons */}
        <div className="hidden sm:flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <Button
                key={p}
                variant={p === current_page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs font-medium"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ) : (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-xs text-muted-foreground"
              >
                ...
              </span>
            ),
          )}
        </div>

        <span className="sm:hidden text-xs px-2 font-medium">
          {current_page} / {total_pages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(current_page + 1)}
          disabled={!has_next}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(total_pages)}
          disabled={!has_next}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
