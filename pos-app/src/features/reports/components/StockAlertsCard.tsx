import React from "react";
import useStockAlert from "@/features/reports/queries/useStockAlert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowDownToLine, Flame, Snail } from "lucide-react";

function AlertItem({
  item,
  icon: Icon,
  iconClass,
}: {
  item: any;
  icon: any;
  iconClass: string;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/80 transition-colors cursor-help group border border-transparent hover:border-border">
            <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted border">
              {item.imageUrl || item.image_url ? (
                <img
                  src={item.imageUrl ?? item.image_url}
                  alt={item.item_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                  No Img
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight truncate">
                {item.item_name}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Icon className={`h-3 w-3 ${iconClass}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {item.quantity ?? item.sales_count ?? "Alert"}
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        {/* We use side="top" to ensure it doesn't get cut off by the grid edges */}
        <TooltipContent
          side="top"
          className="z-[100] bg-popover text-popover-foreground shadow-lg border px-3 py-1.5"
        >
          <p className="text-[11px] font-bold text-primary">Variant Details</p>
          <p className="text-xs">{item.variant_model || "Standard Variant"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function StockAlertsCard() {
  const { data, isLoading, isError, error } = useStockAlert();

  const pkg: any = (data as any)?.data ?? data ?? null;

  const sections = [
    {
      title: "Out of Stock",
      data: pkg?.out_of_stock,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50/50 dark:bg-red-950/10",
    },
    {
      title: "Low Stock",
      data: pkg?.low_stock,
      icon: ArrowDownToLine,
      color: "text-orange-600",
      bg: "bg-orange-50/50 dark:bg-orange-950/10",
    },
    {
      title: "Top Selling",
      data: pkg?.top_selling,
      icon: Flame,
      color: "text-blue-600",
      bg: "bg-blue-50/50 dark:bg-blue-950/10",
    },
    {
      title: "Slow Moving",
      data: pkg?.slow_moving,
      icon: Snail,
      color: "text-slate-600",
      bg: "bg-slate-50/50 dark:bg-slate-950/10",
    },
  ];

  return (
    <Card className="w-full shadow-none border-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-bold">Inventory Insights</CardTitle>
      </CardHeader>

      <CardContent className="px-0">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse border rounded-xl italic text-sm">
            Gathering stock data...
          </div>
        ) : isError ? (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-xs italic">
            {String((error as any)?.message ?? "Failed to load alerts")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sections.map((section) => (
              <div
                key={section.title}
                className={`flex flex-col rounded-xl border ${section.bg} overflow-hidden h-[380px]`}
              >
                {/* Section Header (Fixed) */}
                <div className="flex items-center justify-between p-3 border-b bg-background/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 font-bold"
                  >
                    {section.data?.length ?? 0}
                  </Badge>
                </div>

                {/* Scrollable List Area */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                  <div className="space-y-1">
                    {section.data && section.data.length > 0 ? (
                      section.data.map((item: any) => (
                        <AlertItem
                          key={item.variant_id}
                          item={item}
                          icon={section.icon}
                          iconClass={section.color}
                        />
                      ))
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center opacity-40">
                        <section.icon className="h-8 w-8 mb-2 stroke-[1px]" />
                        <span className="text-[10px] font-medium italic">
                          Clear
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
