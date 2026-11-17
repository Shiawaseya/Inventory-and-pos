import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ColumnDef<T> {
  header: ReactNode | string;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface PaginationProps {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
}

export interface PaginationLinks {
  prev: string | null;
  next: string | null;
}

interface GenericDataTableProps<T> {
  title?: string;
  description?: ReactNode;
  columns: ColumnDef<T>[];
  data: T[];
  pagination: PaginationProps;
  links: PaginationLinks;
  isLoading?: boolean;
  emptyMessage?: string;
  getRowKey: (item: T) => string | number;
}

export function GenericDataTable<T>({
  title,
  description,
  columns,
  data,
  pagination,
  links,
  isLoading = false,
  emptyMessage = "No records found.",
  getRowKey,
}: GenericDataTableProps<T>) {
  const [, setSearchParams] = useSearchParams();

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  };

  const startItem = (pagination.current_page - 1) * pagination.per_page + 1;
  const endItem = Math.min(
    pagination.current_page * pagination.per_page,
    pagination.total_items,
  );

  return (
    <Card className="w-full shadow-sm">
      {(title || description) && (
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-xl font-bold tracking-tight">
                {title}
              </CardTitle>
            )}
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : pagination.total_items > 0 ? (
              <CardDescription>
                Showing{" "}
                <span className="font-medium text-foreground">{startItem}</span>{" "}
                to{" "}
                <span className="font-medium text-foreground">{endItem}</span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {pagination.total_items}
                </span>{" "}
                entries
              </CardDescription>
            ) : null}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="border-t border-b">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead key={idx} className={col.headerClassName}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={getRowKey(item)}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {columns.map((col, colIdx) => (
                      <TableCell key={colIdx} className={col.className}>
                        {col.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="text-xs text-muted-foreground">
          Page{" "}
          <span className="font-semibold text-foreground">
            {pagination.current_page}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagination.total_pages}
          </span>
        </div>

        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (links.prev) handlePageChange(pagination.current_page - 1);
                }}
                aria-disabled={!links.prev}
                className={
                  !links.prev
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (links.next) handlePageChange(pagination.current_page + 1);
                }}
                aria-disabled={!links.next}
                className={
                  !links.next
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>
  );
}
