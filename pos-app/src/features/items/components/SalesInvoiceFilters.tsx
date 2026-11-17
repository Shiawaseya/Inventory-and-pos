// SalesInvoiceFilters.tsx
import { useSearchParams } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { useState } from "react";

// 1. Define the props interface
interface SalesInvoiceFiltersProps {
  employees?: Array<{ id: number; name: string }>;
}

// 2. Add the props parameter with a default value
export function SalesInvoiceFilters({
  employees = [],
}: SalesInvoiceFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [createdBy, setCreatedBy] = useState<string>(
    searchParams.get("created_by") || "",
  );
  const [createdAt, setCreatedAt] = useState<string>(
    searchParams.get("created_at") || "",
  );

  const hasActiveFilters = Boolean(
    searchParams.get("created_by") || searchParams.get("created_at"),
  );

  const applyFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");

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

    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setCreatedBy("");
    setCreatedAt("");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("created_by");
    nextParams.delete("created_at");
    nextParams.set("page", "1");

    setSearchParams(nextParams);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      {/* Employee Filter */}
      <div className="w-[200px]">
        {employees.length > 0 ? (
          <Select
            value={createdBy}
            onValueChange={(val) => setCreatedBy(val === "all" ? "" : val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.name} (#{emp.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type="number"
            placeholder="Created By (ID)"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            className="h-9"
          />
        )}
      </div>

      {/* Date Filter */}
      <div className="w-[180px]">
        <Input
          type="date"
          value={createdAt}
          onChange={(e) => setCreatedAt(e.target.value)}
          className="h-9"
        />
      </div>

      <Button size="sm" onClick={applyFilters} className="h-9 gap-1.5">
        <Filter className="h-3.5 w-3.5" />
        Filter
      </Button>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 gap-1.5 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
