import { useMemo, useState } from "react";
import { Headset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceDesk } from "@/features/reports/queries/useExtraReports";
import { periodToRange, type Period } from "@/features/reports/utils/dateRange";

const fmtHours = (h: number | null) => {
  if (h === null) return "N/A";
  return h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h} hrs`;
};

export default function ServiceDeskCard() {
  const [period, setPeriod] = useState<Period>("month");
  const range = useMemo(() => periodToRange(period), [period]);
  const { data, isLoading, isError, error } = useServiceDesk(range);

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base font-bold">
              Service Desk Performance
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
            Loading service desk...
          </div>
        ) : isError || !data ? (
          <div className="h-40 flex items-center justify-center text-sm text-destructive">
            {String((error as Error)?.message ?? "Failed to load data.")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border bg-blue-500/5">
                <p className="text-xs text-muted-foreground">Avg. to certify</p>
                <p className="text-lg font-bold text-blue-700">
                  {fmtHours(data.avg_certify_hours)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {data.certified} of {data.total} certified
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-amber-500/5">
                <p className="text-xs text-muted-foreground">Open now</p>
                <p className="text-xl font-bold text-amber-700">
                  {data.open.total}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  uncertified, all dates
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/5">
                <p className="text-xs text-muted-foreground">No action logged</p>
                <p className="text-xl font-bold text-red-700">
                  {data.no_action}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  in this period
                </p>
              </div>
            </div>

            {data.open.total > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  0–3 days: {data.open.d0_3}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  4–7 days: {data.open.d4_7}
                </Badge>
                <Badge
                  variant={data.open.d8_plus > 0 ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  8+ days: {data.open.d8_plus}
                </Badge>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Oldest Open Reports
              </h4>
              <div className="space-y-1.5">
                {data.oldest_open.length > 0 ? (
                  data.oldest_open.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <span className="font-medium block truncate">
                          {r.model}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            {r.control_number}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {r.complaint}
                          {r.actions === 0 && " · no action yet"}
                        </span>
                      </div>
                      <Badge
                        variant={r.days_open > 7 ? "destructive" : "secondary"}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {r.days_open}d open
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    Every report is certified.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Defect Rate by Model
              </h4>
              <div className="space-y-1.5">
                {data.defect_rates.length > 0 ? (
                  data.defect_rates.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate max-w-[180px]">
                        {d.model}
                        <span className="text-[10px] text-muted-foreground ml-1.5">
                          ({d.brand})
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {d.incidents} / {d.units_sold} sold
                        {d.rate_pct !== null && (
                          <b className="ml-1.5 text-foreground">
                            {d.rate_pct}%
                          </b>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    No service reports yet.
                  </p>
                )}
              </div>
            </div>

            {data.routing.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Reported To
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.routing.map((r) => (
                    <Badge key={r.destination} variant="outline" className="text-[10px]">
                      {r.destination}: {r.count}
                    </Badge>
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
