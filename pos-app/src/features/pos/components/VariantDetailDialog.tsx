import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StockVariant } from "../api/stockCheckerApi";

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type Props = {
  variant: StockVariant | null;
  onClose: () => void;
};

export function VariantDetailDialog({ variant: v, onClose }: Props) {
  const out = !!v && v.available_count <= 0;
  const low = !!v && !out && v.available_count <= 3;

  const info: [string, string | undefined | null][] = v
    ? [
        ["SKU", v.sku],
        ["Brand", v.brand],
        ["Category", v.category],
        ["Model", v.model || "Default"],
        ["Tracking", v.is_serialized ? "Serialized" : "Non-serialized"],
      ]
    : [];

  return (
    <Dialog open={!!v} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        {v && (
          <>
            <DialogHeader className="shrink-0 border-b border-border/60 p-4 text-left">
              <div className="flex items-start gap-3 pr-6">
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-border/50 object-cover"
                  />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/50 text-primary">
                    <Package size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base leading-snug">
                    {v.item_name}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    {v.model || "Default"}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {peso(v.price)}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                        out
                          ? "border-destructive/20 bg-destructive/10 text-destructive"
                          : low
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {out ? "Out of stock" : `${v.available_count} left`}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs">
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Details
                </h3>
                <dl className="divide-y divide-border/40 rounded-lg border border-border/60">
                  {info
                    .filter(([, val]) => val)
                    .map(([label, val]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 px-3 py-1.5"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right font-medium text-foreground">
                          {val}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Specifications ({v.specs.length})
                </h3>
                {v.specs.length === 0 ? (
                  <p className="text-muted-foreground">
                    No specifications recorded.
                  </p>
                ) : (
                  <dl className="divide-y divide-border/40 rounded-lg border border-border/60">
                    {v.specs.map((s) => (
                      <div
                        key={s.attribute_id}
                        className="flex justify-between gap-4 px-3 py-1.5"
                      >
                        <dt className="text-muted-foreground">{s.name}</dt>
                        <dd className="text-right font-medium text-foreground">
                          {s.value}
                          {s.unit ? ` ${s.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
