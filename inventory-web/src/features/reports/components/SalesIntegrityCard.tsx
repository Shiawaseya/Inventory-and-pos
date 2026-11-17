import { useMemo, useState } from "react";
import { ShieldCheck, Ban, Hourglass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalesIntegrity } from "@/features/reports/queries/useExtraReports";
import { periodToRange, type Period } from "@/features/reports/utils/dateRange";

const php = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

const age = (h: number) => (h >= 24 ? `${Math.floor(h / 24)}d` : `${h}h`);

export default function SalesIntegrityCard() {
  const [period, setPeriod] = useState<Period>("month");
  const range = useMemo(() => periodToRange(period), [period]);
  const { data, isLoading, isError, error } = useSalesIntegrity(range);

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold">
              Approvals & Voids
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
            Loading approvals...
          </div>
        ) : isError || !data ? (
          <div className="h-40 flex items-center justify-center text-sm text-destructive">
            {String((error as Error)?.message ?? "Failed to load data.")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border bg-green-500/5">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-green-700">
                  {data.summary.completed.count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {php(data.summary.completed.amount)}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ban className="h-3 w-3" /> Voided
                </p>
                <p className="text-xl font-bold text-red-700">
                  {data.summary.voided.count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {data.void_rate}% void rate
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-amber-500/5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hourglass className="h-3 w-3" /> Pending
                </p>
                <p className="text-xl font-bold text-amber-700">
                  {data.summary.pending_authorization.count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {php(data.summary.pending_authorization.amount)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Awaiting Authorization
              </h4>
              <div className="space-y-1.5">
                {data.pending_queue.length > 0 ? (
                  data.pending_queue.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <span className="font-medium block truncate">
                          {p.invoice_number}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.staff} · {php(p.amount)}
                        </span>
                      </div>
                      <Badge
                        variant={
                          p.age_hours >= 24 ? "destructive" : "secondary"
                        }
                        className="text-[10px] h-5"
                      >
                        {age(p.age_hours)} waiting
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    Nothing waiting for approval.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Voids by OIC
              </h4>
              <div className="space-y-1.5">
                {data.voids_by_staff.length > 0 ? (
                  data.voids_by_staff.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs border-b pb-1.5 last:border-0"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.voids} void{s.voids > 1 ? "s" : ""} · {php(s.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground text-center py-3">
                    No voids in this period.
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
