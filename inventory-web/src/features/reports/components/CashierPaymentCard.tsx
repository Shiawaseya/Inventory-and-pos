import useCashierPaymentAnalytics from "@/features/reports/queries/useCashierPaymentAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Wallet, Award } from "lucide-react";

const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CashierPaymentCard() {
  const { data, isLoading, isError } = useCashierPaymentAnalytics();
  const pkg = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-48 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
          Loading cashier & payment analytics...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="h-full">
        <CardContent className="h-48 flex items-center justify-center text-sm text-destructive">
          Failed to load cashier metrics.
        </CardContent>
      </Card>
    );
  }

  const paymentData = (pkg?.payment_distribution ?? []).map((p: any) => ({
    name: p.method,
    value: p.amount,
  }));
  const staff = pkg?.staff_leaderboard ?? [];

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">
            Payments & Sales representative performance
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Split Donut */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
            Collections by Method
          </p>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  innerRadius={40}
                  outerRadius={55}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatPHP(val), "Total"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {paymentData.map((p: any, idx: number) => (
              <span
                key={idx}
                className="text-[10px] flex items-center gap-1 text-muted-foreground"
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor:
                      PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
                  }}
                />
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Staff Leaderboard */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-amber-500" /> SR Performance
          </p>
          <div className="space-y-2">
            {staff.length > 0 ? (
              staff.map((s: any, idx: number) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs border-b pb-1.5 last:border-0"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      #{idx + 1} {s.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {s.invoices} transactions
                    </span>
                  </div>
                  <span className="font-bold text-primary">
                    {formatPHP(s.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground italic text-center py-4">
                No cashier activity recorded.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
