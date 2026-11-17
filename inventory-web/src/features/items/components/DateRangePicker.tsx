import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Self-contained single-calendar date range picker (no extra dependencies). */

export type DateRangeValue = { from: string; to: string }; // YYYY-MM-DD

type Props = {
  value: DateRangeValue | null;
  onChange: (range: DateRangeValue | null) => void;
  placeholder?: string;
  /** Overrides the trigger text (e.g. "Today" for the default range). */
  label?: string;
  /** Show the clear (X) button when a value is set. Default true. */
  clearable?: boolean;
  className?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const label = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  label: labelOverride,
  clearable = true,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() =>
    monthStart(value?.from ? fromISO(value.from) : new Date()),
  );
  const [start, setStart] = useState<string | null>(null); // first click, waiting for the end
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const todayISO = toISO(new Date());

  const days = useMemo(() => {
    const first = monthStart(view);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const gridStart = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [view]);

  const apply = (from: string, to: string) => {
    onChange({ from, to });
    setStart(null);
    setHover(null);
    setOpen(false);
  };

  const pick = (iso: string) => {
    if (!start) {
      setStart(iso);
      return;
    }
    apply(iso < start ? iso : start, iso < start ? start : iso);
  };

  // Highlight range: the picked range, or the in-progress start..hover
  const rangeFrom = start ?? value?.from ?? null;
  const rangeTo = start ? (hover ?? start) : (value?.to ?? null);
  const lo =
    rangeFrom && rangeTo ? (rangeFrom < rangeTo ? rangeFrom : rangeTo) : null;
  const hi =
    rangeFrom && rangeTo ? (rangeFrom < rangeTo ? rangeTo : rangeFrom) : null;

  const presets: { label: string; get: () => [Date, Date] }[] = [
    { label: "Today", get: () => [new Date(), new Date()] },
    {
      label: "Yesterday",
      get: () => [addDays(new Date(), -1), addDays(new Date(), -1)],
    },
    { label: "Last 7 days", get: () => [addDays(new Date(), -6), new Date()] },
    {
      label: "This week",
      get: () => {
        const t = new Date();
        const mon = addDays(t, -((t.getDay() + 6) % 7));
        return [mon, addDays(mon, 6)];
      },
    },
    {
      label: "This month",
      get: () => {
        const t = new Date();
        return [monthStart(t), new Date(t.getFullYear(), t.getMonth() + 1, 0)];
      },
    },
    {
      label: "This year",
      get: () => {
        const y = new Date().getFullYear();
        return [new Date(y, 0, 1), new Date(y, 11, 31)];
      },
    },
  ];

  const triggerText = labelOverride
    ? labelOverride
    : value
      ? value.from === value.to
        ? label(value.from)
        : `${label(value.from)} – ${label(value.to)}`
      : placeholder;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 text-xs font-normal",
            value && clearable && "pr-8",
          )}
          onClick={() => setOpen((o) => !o)}
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className={cn(!value && "text-muted-foreground")}>
            {triggerText}
          </span>
        </Button>
        {value && clearable && (
          <button
            type="button"
            aria-label="Clear date range"
            className="-ml-7 z-10 p-1 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange(null);
              setStart(null);
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex w-max max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg sm:flex-row">
          {/* Presets */}
          <div className="flex flex-row flex-wrap gap-1 sm:w-28 sm:flex-col">
            {presets.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 justify-start px-2 text-xs"
                onClick={() => {
                  const [a, b] = p.get();
                  apply(toISO(a), toISO(b));
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="w-64">
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-semibold">
                {view.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div
              className="grid grid-cols-7"
              onMouseLeave={() => setHover(null)}
            >
              {days.map((d) => {
                const iso = toISO(d);
                const outside = d.getMonth() !== view.getMonth();
                const inRange = lo && hi && iso >= lo && iso <= hi;
                const isEdge = iso === lo || iso === hi;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => pick(iso)}
                    onMouseEnter={() => start && setHover(iso)}
                    className={cn(
                      "h-8 text-xs tabular-nums transition-colors",
                      outside && "text-muted-foreground/40",
                      inRange && !isEdge && "bg-primary/10",
                      isEdge &&
                        "rounded-md bg-primary font-semibold text-primary-foreground",
                      !inRange && "rounded-md hover:bg-muted",
                      iso === todayISO && !isEdge && "font-bold text-primary",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {start
                ? "Now pick the end date"
                : "Pick the start date, then the end date"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
