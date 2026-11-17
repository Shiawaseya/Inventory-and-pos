"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarDays, Filter } from "lucide-react";
import useSalesAnalytics from "@/features/reports/queries/useSalesAnalytics";
import type { GetSalesAnalyticsParams } from "@/features/reports/api/getSalesAnalytics";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function SalesAnalyticsCard() {
  const [period, setPeriod] = useState<string>("custom");
  const [startDate, setStartDate] = useState<string>("2026-04-13");
  const [endDate, setEndDate] = useState<string>("2026-04-15");

  const params = useMemo(() => {
    const p: GetSalesAnalyticsParams = { period } as GetSalesAnalyticsParams;
    if (period === "custom") {
      if (startDate) p.start_date = startDate;
      if (endDate) p.end_date = endDate;
    }
    return p;
  }, [period, startDate, endDate]);

  const {
    data: qdata,
    isLoading,
    isError,
    error,
    refetch,
  } = useSalesAnalytics(params, {
    enabled: !!(period !== "custom" || (startDate && endDate)),
    staleTime: 1000 * 60 * 2,
  });

  const pkg: any = (qdata as any)?.data ?? (qdata as any);

  // Data Transformations
  const trendData = useMemo(
    () =>
      (pkg?.trend ?? []).map((item: any) => ({
        date: item.label,
        total: Number(item.total ?? 0),
      })),
    [pkg],
  );

  const categoryData = useMemo(
    () =>
      (pkg?.category_distribution ?? []).map((item: any) => ({
        name: item.category_name,
        value: parseFloat(item.revenue ?? 0),
      })),
    [pkg],
  );

  const peakHoursData = useMemo(
    () =>
      (pkg?.peak_hours ?? [])
        .filter((item: any) => Number(item.revenue ?? 0) > 0)
        .map((item: any) => ({
          hour: item.label,
          revenue: Number(item.revenue ?? 0),
        })),
    [pkg],
  );

  const totalRevenue = categoryData.reduce(
    (sum: number, item: any) => sum + item.value,
    0,
  );

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Sales Performance</CardTitle>
              <CardDescription>
                {pkg?.period?.start} — {pkg?.period?.end}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v)}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-[140px] h-9 bg-background"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  className="w-[140px] h-9 bg-background"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <Button
              size="sm"
              onClick={() => refetch()}
              variant="secondary"
              className="gap-2"
            >
              <Filter className="w-4 h-4" /> Apply
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center animate-pulse text-muted-foreground">
            Gathering your insights...
          </div>
        ) : isError ? (
          <div className="p-4 rounded-lg bg-destructive/5 text-destructive border border-destructive/20 text-sm">
            {String((error as any)?.message ?? "Failed to load analytics")}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border rounded-xl p-4 bg-muted/5">
              <StatItem
                label="Total Revenue"
                value={`$${totalRevenue.toLocaleString()}`}
              />
              <StatItem label="Unique Categories" value={categoryData.length} />
              <StatItem
                label="Peak Performance"
                value={peakHoursData[0]?.hour ?? "N/A"}
              />
            </div>

            {/* 3 Charts Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Trend Area Chart */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Revenue Trend
                </h4>
                <div className="h-[280px] w-full border rounded-xl p-2 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient
                          id="colorTotal"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f0f0f0"
                      />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Donut Chart */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Category Split
                </h4>
                <div className="h-[280px] w-full border rounded-xl p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Bar Chart */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Hourly Activity
                </h4>
                <div className="h-[280px] w-full border rounded-xl p-2 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f0f0f0"
                      />
                      <XAxis
                        dataKey="hour"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: "#f8fafc" }} />
                      <Bar
                        dataKey="revenue"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
    </div>
  );
}
