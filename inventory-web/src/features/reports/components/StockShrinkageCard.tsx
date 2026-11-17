import { useMemo, useState } from "react";
import { PackageX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStockShrinkage } from "@/features/reports/queries/useExtraReports";
import { periodToRange, type Period } from "@/features/reports/utils/dateRange";

const php = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-500",
  sold: "bg-blue-500",
  reserved: "bg-amber-500",
  returned: "bg-slate-400",
  damaged: "bg-orange-500",
  lost: "bg-red-500",
  written_off: "bg-zinc-700",
};

export default function StockShrinkageCard() {
  const [period, setPeriod] = useState<Period>("month");
  const range = useMemo(() => periodToRange(period), [period]);
  const { data, isLoading, isError, error } = useStockShrinkage(range);

  const total = data?.status_snapshot.reduce((s, x) => s + x.units, 0) ?? 0;
  const lossMoved = data
    ? data.moved_to_loss.damaged +
      data.moved_to_loss.lost +
      data.moved_to_loss.written_off
    : 0;

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base font-bold">
              Stock Shrinkage
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
            Loading stock movements...
          </div>
        ) : isError || !data ? (
          <div className="h-40 flex items-center justify-center text-sm text-destructive">
            {String((error as Error)?.message ?? "Failed to load data.")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border bg-orange-500/5">
                <p className="text-xs text-muted-foreground">
                  Marked lost / damaged
                </p>
                <p className="text-xl font-bold text-orange-700">{lossMoved}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.moved_to_loss.damaged} damaged ·{" "}
                  {data.moved_to_loss.lost} lost ·{" "}
                  {data.moved_to_loss.written_off} written off
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/5">
                <p className="text-xs text-muted-foreground">
                  Value tied up now
                </p>
                <p className="text-xl font-bold text-red-700">
                  {php(data.at_risk.value)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {data.at_risk.units} units at retail price
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Unit Status (current)
              </h4>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {data.status_snapshot.map((s) => (
                  <div
                    key={s.status}
                    className={STATUS_COLOR[s.status] ?? "bg-slate-300"}
                    style={{ width: `${total ? (s.units / total) * 100 : 0}%` }}
                    title={`${label(s.status)}: ${s.units}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {data.status_snapshot.map((s) => (
                  <span
                    key={s.status}
                    className="text-[10px] flex items-center gap-1 text-muted-foreground"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_COLOR[s.status] ?? "bg-slate-300"}`}
                    />
                    {label(s.status)} {s.units}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Adjustments by Reason
              </h4>
              <div className="space-y-1.5">
                {data.by_reason.length > 0 ? (
                  data.by_reason.map((r) => (
                    <div
                      key={r.reason}
                      className="flex items-center justify-between text-xs border-b pb-1.5 last:border-0"
                    >
                      <span className="font-medium">{label(r.reason)}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {r.units} unit{r.units > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    No adjustments in this period.
                  </p>
                )}
              </div>
            </div>

            {data.top_affected.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Most Affected Models
                </h4>
                <div className="space-y-1.5">
                  {data.top_affected.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate max-w-[200px]">
                        {t.name}
                        <span className="text-[10px] text-muted-foreground ml-1.5">
                          ({t.item})
                        </span>
                      </span>
                      <span className="font-semibold">{t.units}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
