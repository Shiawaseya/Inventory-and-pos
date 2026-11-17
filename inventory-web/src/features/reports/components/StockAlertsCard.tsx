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
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowDownToLine,
  Flame,
  Printer,
  Snail,
} from "lucide-react";

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type PrintSection = { title: string; data?: any[]; qtyLabel: string };

// Prints through a hidden iframe so it is not blocked like a popup window.
function printStockAlerts(sections: PrintSection[]) {
  const body = sections
    .map((s) => {
      const rows = (s.data ?? [])
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.item_name)}</td>
            <td>${escapeHtml(item.variant_model || "Standard Variant")}</td>
            <td class="num">${escapeHtml(item.quantity ?? item.sales_count ?? "-")}</td>
          </tr>`,
        )
        .join("");
      return `<h2>${escapeHtml(s.title)} <span>(${s.data?.length ?? 0})</span></h2>
        ${
          rows
            ? `<table><thead><tr><th>Item</th><th>Variant</th><th class="num">${escapeHtml(
                s.qtyLabel,
              )}</th></tr></thead><tbody>${rows}</tbody></table>`
            : `<p class="empty">Clear</p>`
        }`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <title>Inventory Insights</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 24px; font-size: 12px; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      .meta { color: #666; margin-bottom: 16px; }
      h2 { font-size: 14px; margin: 18px 0 6px; }
      h2 span { color: #666; font-weight: normal; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; text-align: left; }
      th { background: #f3f3f3; }
      .num { text-align: right; width: 70px; }
      .empty { color: #888; font-style: italic; }
    </style></head><body>
    <h1>Inventory Insights</h1>
    <div class="meta">Printed ${escapeHtml(new Date().toLocaleString("en-PH"))}</div>
    ${body}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

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
      <CardHeader className="px-0 pt-0 pb-4 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-bold">Inventory Insights</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 print:hidden"
          disabled={isLoading || isError || !pkg}
          onClick={() =>
            printStockAlerts(
              sections.map((sec) => ({
                title: sec.title,
                data: sec.data,
                qtyLabel: sec.title === "Top Selling" ? "Sold" : "Qty",
              })),
            )
          }
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print
        </Button>
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
