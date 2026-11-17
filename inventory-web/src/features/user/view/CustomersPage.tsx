import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GenericDataTable,
  type ColumnDef,
} from "@/components/ui/generic-data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateCustomerForm from "../components/createCustomerForm";
import { useCustomers } from "../queries/useCustomers";
import type { Customer } from "../types/customer";

const PER_PAGE = 10;
const DEFAULT_SORT = "last_name";

// Values map to the backend SORT_MAP keys. A leading "-" means descending.
const SORT_OPTIONS = [
  { value: "last_name", label: "Name (A–Z)" },
  { value: "-last_name", label: "Name (Z–A)" },
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "city_municipality", label: "City (A–Z)" },
];

function displayValue(value: string | null | undefined) {
  return value || "—";
}

function fullName(customer: Customer) {
  return (
    [customer.first_name, customer.middle_name, customer.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed customer"
  );
}

function formatAddress(customer: Customer) {
  const address = customer.address;
  if (!address) return "—";

  return (
    [
      address.street_address,
      address.barangay,
      address.city_municipality,
      address.province,
      address.region,
      address.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const rawPage = Number(searchParams.get("page") || "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") || DEFAULT_SORT;

  // Local input state so typing is instant; URL/query update is debounced.
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;

    const timeout = window.setTimeout(() => {
      updateParams({ search: trimmed || null, page: null });
    }, 400);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(changes: Record<string, string | null>) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useCustomers(
    page,
    PER_PAGE,
    { search, sort },
  );

  const customers = data?.data ?? [];
  const pagination = data?.pagination ?? {
    total_items: 0,
    total_pages: 1,
    current_page: page,
    per_page: PER_PAGE,
  };

  const hasFilters = search !== "" || sort !== DEFAULT_SORT;

  // If the current page no longer exists (e.g. after searching), go back to page 1.
  useEffect(() => {
    if (
      !isLoading &&
      pagination.total_pages > 0 &&
      page > pagination.total_pages
    ) {
      updateParams({ page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pagination.total_pages, page]);

  function clearFilters() {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  }

  const columns: ColumnDef<Customer>[] = [
    {
      header: "Customer",
      cell: (customer) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{fullName(customer)}</p>
            <p className="text-xs text-muted-foreground">
              Customer #{customer.customer_id}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Contact Number",
      cell: (customer) => displayValue(customer.contact_number),
    },
    {
      header: "Email",
      cell: (customer) => displayValue(customer.email_address),
    },
    { header: "Address", cell: formatAddress },
    { header: "TIN", cell: (customer) => displayValue(customer.tin) },
    {
      header: "Business Style",
      cell: (customer) => displayValue(customer.business_style),
    },
    {
      header: "Created",
      cell: (customer) => formatDate(customer.created_at),
    },
    {
      header: "Actions",
      headerClassName: "text-center",
      className: "text-center",
      cell: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">
                Open actions for {fullName(customer)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Customer actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                navigate(
                  `/authenticated/sales/transactions?customer_id=${customer.customer_id}`,
                )
              }
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              View transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const emptyMessage = search
    ? `No customers match “${search}”.`
    : "No customers yet. Add your first customer to get started.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-muted-foreground">
            Browse all customers, add new ones, and view their transactions.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add customer
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, contact, email, or city"
            aria-label="Search customers"
            className="pl-9"
          />
        </div>

        <Select
          value={sort}
          onValueChange={(value) =>
            updateParams({
              sort: value === DEFAULT_SORT ? null : value,
              page: null,
            })
          }
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Sort customers">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {isError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            {error instanceof Error
              ? error.message
              : "Unable to load customers."}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Try again
          </Button>
        </div>
      ) : (
        <GenericDataTable
          title="Customer list"
          description={
            pagination.total_items > 0
              ? `${pagination.total_items} customer${
                  pagination.total_items === 1 ? "" : "s"
                }${search ? ` matching “${search}”` : ""}`
              : "All registered customers"
          }
          columns={columns}
          data={customers}
          isLoading={isLoading}
          pagination={pagination}
          links={{
            prev: data?.links.prev ?? null,
            next: data?.links.next ?? null,
          }}
          getRowKey={(customer) => customer.customer_id}
          emptyMessage={emptyMessage}
        />
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Enter the customer's details. Only one field is required.
            </DialogDescription>
          </DialogHeader>
          <CreateCustomerForm
            onCancel={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              void queryClient.invalidateQueries({ queryKey: ["customers"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
