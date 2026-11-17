import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomerInsights } from "@/features/reports/queries/useExtraReports";
import { periodToRange, type Period } from "@/features/reports/utils/dateRange";

const php = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

export default function CustomerInsightsCard() {
  const [period, setPeriod] = useState<Period>("month");
  const range = useMemo(() => periodToRange(period), [period]);
  const { data, isLoading, isError, error } = useCustomerInsights(range);

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold">
              Customer Insights
            </CardTitle>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
            Loading customers...
          </div>
        ) : isError || !data ? (
          <div className="h-40 flex items-center justify-center text-sm text-destructive">
            {String((error as Error)?.message ?? "Failed to load data.")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border bg-blue-500/5">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-blue-700">
                  {data.active_customers}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {data.returning_customers} returning ({data.returning_pct}%)
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-green-500/5">
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl font-bold text-green-700">
                  {data.new_customers}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  records added
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Top Customers
              </h4>
              <div className="space-y-1.5">
                {data.top_customers.length > 0 ? (
                  data.top_customers.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs border-b pb-1.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold">
                          #{i + 1} {c.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {c.invoices} purchase{c.invoices > 1 ? "s" : ""} ·
                          last {c.last_purchase}
                        </span>
                      </div>
                      <span className="font-bold text-primary">
                        {php(c.spend)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    No registered-customer sales in this period.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
