import useWarrantyAnalytics from "@/features/reports/queries/useWarrantyAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, ShieldAlert, Clock } from "lucide-react";

export default function WarrantyAlertsCard() {
  const { data, isLoading, isError } = useWarrantyAnalytics();
  const pkg = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-48 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
          Loading service metrics...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="h-full">
        <CardContent className="h-48 flex items-center justify-center text-sm text-destructive">
          Failed to load service metrics.
        </CardContent>
      </Card>
    );
  }

  const summary = pkg?.summary ?? { total: 0, pending: 0, certified: 0 };
  const models = pkg?.top_reported_models ?? [];

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base font-bold">
              Service & Warranty
            </CardTitle>
          </div>
          {summary.pending > 0 && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 text-[11px]"
            >
              <Clock className="h-3 w-3" /> {summary.pending} Uncertified
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg border bg-amber-500/5">
            <p className="text-xs text-muted-foreground">Pending Action</p>
            <p className="text-xl font-bold text-amber-700">
              {summary.pending}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-green-500/5">
            <p className="text-xs text-muted-foreground">
              Resolved / Certified
            </p>
            <p className="text-xl font-bold text-green-700">
              {summary.certified}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" /> Common
            Complaints
          </h4>
          <div className="space-y-1.5">
            {models.length > 0 ? (
              models.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
                >
                  <div className="truncate max-w-[180px]">
                    <span className="font-medium text-foreground">
                      {item.model}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({item.brand})
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {item.incidents} claims
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground italic text-center py-4">
                No active complaints reported.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
