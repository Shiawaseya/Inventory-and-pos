import { useState, useMemo } from "react";
import { TrendingUp, Receipt, Package, Info } from "lucide-react";
import useKpi from "@/features/reports/queries/useKpi";
import type { GetKpiParams } from "@/features/reports/api/getKpi";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(v);
}

export default function KpiCard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>("week");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const params = useMemo(() => {
    const p: GetKpiParams = { period } as GetKpiParams;
    if (period === "custom") {
      if (startDate) p.start_date = startDate;
      if (endDate) p.end_date = endDate;
    }
    return p;
  }, [period, startDate, endDate]);

  const enabled = period !== "custom" || (!!startDate && !!endDate);
  const { data, isLoading, isError, error } = useKpi(params, {
    staleTime: 1000 * 60 * 2,
    enabled,
  });

  const raw: any = data as any;
  const pkg: any = raw?.data ?? raw ?? null;

  // Handler to navigate to Transactions with the active date parameters
  const handleTransactionsClick = () => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", "1");

    // Use the KPI response calculated start date, or custom user input
    const effectiveStartDate = pkg?.period?.start || startDate;
    if (effectiveStartDate) {
      searchParams.set("created_at", effectiveStartDate);
    }

    navigate({
      pathname: "/authenticated/dashboard/Transactions",
      search: `?${searchParams.toString()}`,
    });
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold">
              Performance Overview
            </CardTitle>
            <CardDescription>
              Monitor your business vitals and sales trends
            </CardDescription>
          </div>

          {/* Period Selector */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="period"
                className="text-xs uppercase font-semibold text-muted-foreground"
              >
                Select Range
              </Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period" className="w-[140px] h-9">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <div className="space-y-1.5">
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={startDate ?? ""}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="space-y-1.5">
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={endDate ?? ""}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground animate-pulse">
            Updating metrics...
          </div>
        ) : isError ? (
          <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            {String((error as any)?.message ?? "Failed to load KPI data.")}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dynamic Metrics Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  Period Metrics
                </Badge>
                <span className="text-xs text-muted-foreground italic">
                  {pkg?.period?.start
                    ? `${pkg.period.start} to ${pkg.period.end}`
                    : "Current Period"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Sales
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {formatCurrency(Number(pkg?.total_sales ?? 0))}
                    </h2>
                  </div>
                </div>

                {/* Clickable Transactions Card */}
                <div
                  className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-start gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={handleTransactionsClick}
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Transactions
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {Number(pkg?.transaction_count ?? 0)}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Static/Global Metrics Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className="rounded-sm px-1 font-normal"
                >
                  Snapshot
                </Badge>
                <span className="text-xs text-muted-foreground italic">
                  Current overall inventory status
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-muted/30 flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Inventory Value
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {formatCurrency(Number(pkg?.inventory_value ?? 0))}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
