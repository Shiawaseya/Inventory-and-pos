import { useSearchParams } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Filter,
  RotateCcw,
  User,
  Calendar,
  Activity,
  X,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import { useState, useMemo } from "react";

interface SalesInvoiceFiltersProps {
  employees?: Array<{ id: number; name: string }>;
  hideStatusFilter?: boolean;
}

const invoiceStatuses = [
  { value: "completed", label: "Completed" },
  { value: "parked", label: "Parked" },
  { value: "pending_authorization", label: "Pending Auth" },
  { value: "authorized", label: "Authorized" },
  { value: "rejected", label: "Rejected" },
  { value: "voided", label: "Voided" },
] as const;

export function SalesInvoiceFilters({
  employees = [],
  hideStatusFilter = false,
}: SalesInvoiceFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentInvoiceNumber = searchParams.get("sales_invoice_number") || "";
  const currentCreatedBy = searchParams.get("created_by") || "";
  const currentCreatedAt = searchParams.get("created_at") || "";
  const currentStatus = searchParams.get("status") || "";

  const [invoiceNumber, setInvoiceNumber] =
    useState<string>(currentInvoiceNumber);
  const [createdBy, setCreatedBy] = useState<string>(currentCreatedBy);
  const [createdAt, setCreatedAt] = useState<string>(currentCreatedAt);
  const [status, setStatus] = useState<string>(currentStatus);

  const hasPendingChanges = useMemo(() => {
    return (
      invoiceNumber !== currentInvoiceNumber ||
      createdBy !== currentCreatedBy ||
      createdAt !== currentCreatedAt ||
      (!hideStatusFilter && status !== currentStatus)
    );
  }, [
    invoiceNumber,
    createdBy,
    createdAt,
    status,
    currentInvoiceNumber,
    currentCreatedBy,
    currentCreatedAt,
    currentStatus,
    hideStatusFilter,
  ]);

  const activeCount = useMemo(() => {
    const active = [currentInvoiceNumber, currentCreatedBy, currentCreatedAt];
    if (!hideStatusFilter && currentStatus) active.push(currentStatus);
    return active.filter(Boolean).length;
  }, [
    currentInvoiceNumber,
    currentCreatedBy,
    currentCreatedAt,
    currentStatus,
    hideStatusFilter,
  ]);

  const activeEmployeeName = useMemo(() => {
    if (!currentCreatedBy) return null;
    const found = employees.find((e) => e.id.toString() === currentCreatedBy);
    return found ? found.name : `ID #${currentCreatedBy}`;
  }, [currentCreatedBy, employees]);

  const activeStatusLabel = useMemo(() => {
    if (!currentStatus) return null;
    const found = invoiceStatuses.find((s) => s.value === currentStatus);
    return found ? found.label : currentStatus;
  }, [currentStatus]);

  const applyFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");

    if (invoiceNumber.trim()) {
      nextParams.set("sales_invoice_number", invoiceNumber.trim());
    } else {
      nextParams.delete("sales_invoice_number");
    }

    if (createdBy) {
      nextParams.set("created_by", createdBy);
    } else {
      nextParams.delete("created_by");
    }

    if (createdAt) {
      nextParams.set("created_at", createdAt);
    } else {
      nextParams.delete("created_at");
    }

    if (!hideStatusFilter) {
      if (status) {
        nextParams.set("status", status);
      } else {
        nextParams.delete("status");
      }
    }

    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setInvoiceNumber("");
    setCreatedBy("");
    setCreatedAt("");
    setStatus("");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("sales_invoice_number");
    nextParams.delete("created_by");
    nextParams.delete("created_at");
    if (!hideStatusFilter) {
      nextParams.delete("status");
    }
    nextParams.set("page", "1");

    setSearchParams(nextParams);
  };

  const removeSingleFilter = (
    key: "sales_invoice_number" | "created_by" | "created_at" | "status",
  ) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(key);
    nextParams.set("page", "1");
    if (key === "sales_invoice_number") setInvoiceNumber("");
    if (key === "created_by") setCreatedBy("");
    if (key === "created_at") setCreatedAt("");
    if (key === "status") setStatus("");
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {/* Top Filter Controls Bar */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Invoice Number Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search invoice number (e.g. SI-2026-0001)..."
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilters();
                }
              }}
              className="h-9 pl-8 text-xs font-mono bg-background/80"
            />
          </div>

          {/* Employee Filter */}
          <div className="w-full sm:w-[170px]">
            {employees.length > 0 ? (
              <Select
                value={createdBy || "all"}
                onValueChange={(val) => setCreatedBy(val === "all" ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background/80 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Staff / Cashier" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Employees
                  </SelectItem>
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id.toString()}
                      className="text-xs"
                    >
                      {emp.name} (#{emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Staff ID..."
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="h-9 pl-8 text-xs bg-background/80"
                />
              </div>
            )}
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-[155px]">
            <Input
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="h-9 text-xs bg-background/80 hover:bg-accent/40 transition-colors cursor-pointer"
            />
          </div>

          {/* Status Filter */}
          {!hideStatusFilter && (
            <div className="w-full sm:w-[165px]">
              <Select
                value={status || "all"}
                onValueChange={(val) => setStatus(val === "all" ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background/80 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <Activity className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Statuses
                  </SelectItem>
                  {invoiceStatuses.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="text-xs"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 xl:pt-0">
          <Button
            size="sm"
            onClick={applyFilters}
            className={`h-9 px-3.5 text-xs font-semibold gap-1.5 transition-all shadow-xs ${
              hasPendingChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/20"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Filter className="size-3.5" />
            Apply
          </Button>

          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors border-dashed"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Applied Filters Tags Bar */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <span className="text-[11px] font-medium mr-1 flex items-center gap-1">
            <SlidersHorizontal className="size-3" /> Active:
          </span>

          {currentInvoiceNumber && (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-0.5 text-[11px] font-normal border border-border/60 font-mono"
            >
              <Search className="size-3 text-muted-foreground" />
              <span>#{currentInvoiceNumber}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter("sales_invoice_number")}
                className="hover:text-foreground ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {currentCreatedBy && (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-0.5 text-[11px] font-normal border border-border/60"
            >
              <User className="size-3 text-muted-foreground" />
              <span>{activeEmployeeName}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter("created_by")}
                className="hover:text-foreground ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {currentCreatedAt && (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-0.5 text-[11px] font-normal border border-border/60"
            >
              <Calendar className="size-3 text-muted-foreground" />
              <span>{currentCreatedAt}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter("created_at")}
                className="hover:text-foreground ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {!hideStatusFilter && currentStatus && (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-0.5 text-[11px] font-normal border border-border/60"
            >
              <Activity className="size-3 text-muted-foreground" />
              <span>{activeStatusLabel}</span>
              <button
                type="button"
                onClick={() => removeSingleFilter("status")}
                className="hover:text-foreground ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-muted-foreground hover:text-destructive underline ml-1 cursor-pointer transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
