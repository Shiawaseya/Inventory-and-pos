import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  FacetAttribute,
  FacetUnit,
  SpecFilterState,
} from "../api/stockCheckerApi";
import { isSpecActive } from "../api/stockCheckerApi";

type Props = {
  attributes: FacetAttribute[];
  value: Record<number, SpecFilterState>;
  onChange: (next: Record<number, SpecFilterState>) => void;
};

const fmt = (n: number) => String(Number(n.toFixed(4)));

export function SpecFilters({ attributes, value, onChange }: Props) {
  const patch = (id: number, next: Partial<SpecFilterState>) =>
    onChange({ ...value, [id]: { ...value[id], ...next } });
  const clear = (id: number) => {
    const { [id]: _removed, ...rest } = value;
    onChange(rest);
  };

  if (!attributes.length) {
    return (
      <p className="text-xs text-[#8b938c]">
        No specifications to filter for this selection.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {attributes.map((attr) => {
        const state = value[attr.attribute_id];
        return (
          <div key={attr.attribute_id}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#68736d]">
                {attr.name}
              </p>
              {isSpecActive(state) && (
                <button
                  onClick={() => clear(attr.attribute_id)}
                  className="flex items-center gap-1 text-[11px] text-[#be5b38] hover:underline"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {attr.data_type === "numeric" && (
              <NumericRange
                units={attr.units}
                state={state}
                onChange={(next) => patch(attr.attribute_id, next)}
              />
            )}

            {attr.data_type === "option" && (
              <div className="flex flex-wrap gap-1.5">
                {attr.options.map((opt) => {
                  const on = state?.option_ids?.includes(opt.option_id);
                  return (
                    <button
                      key={opt.option_id}
                      onClick={() =>
                        patch(attr.attribute_id, {
                          option_ids: on
                            ? (state?.option_ids ?? []).filter(
                                (x) => x !== opt.option_id,
                              )
                            : [...(state?.option_ids ?? []), opt.option_id],
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        on
                          ? "border-[#1d6b50] bg-[#1d6b50] text-white"
                          : "border-[#d8d1c3] bg-white text-[#24312d] hover:border-[#1d6b50]"
                      }`}
                    >
                      {opt.value}{" "}
                      <span
                        className={on ? "text-[#b9d8c7]" : "text-[#8b938c]"}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {attr.data_type === "text" && (
              <Input
                value={state?.text ?? ""}
                onChange={(e) =>
                  patch(attr.attribute_id, { text: e.target.value })
                }
                placeholder={`Contains…`}
                className="h-8 bg-white text-sm"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NumericRange({
  units,
  state,
  onChange,
}: {
  units: FacetUnit[];
  state?: SpecFilterState;
  onChange: (next: Partial<SpecFilterState>) => void;
}) {
  // Same attribute can be stored in several units; filter must name one.
  const unit =
    units.find((u) => u.unit_id === (state?.unit_id ?? units[0].unit_id)) ??
    units[0];

  return (
    <div className="space-y-2">
      {units.length > 1 && (
        <select
          value={String(unit.unit_id ?? "")}
          onChange={(e) =>
            onChange({
              unit_id: e.target.value === "" ? null : Number(e.target.value),
              min: "",
              max: "",
            })
          }
          className="h-8 w-full rounded-md border border-[#d8d1c3] bg-white px-2 text-xs"
        >
          {units.map((u) => (
            <option key={u.unit_id ?? "none"} value={u.unit_id ?? ""}>
              {u.symbol ?? "no unit"}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          value={state?.min ?? ""}
          min={unit.min}
          max={unit.max}
          placeholder={fmt(unit.min)}
          onChange={(e) =>
            onChange({ min: e.target.value, unit_id: unit.unit_id })
          }
          className="h-8 bg-white text-sm"
        />
        <span className="text-xs text-[#8b938c]">to</span>
        <Input
          type="number"
          inputMode="decimal"
          value={state?.max ?? ""}
          min={unit.min}
          max={unit.max}
          placeholder={fmt(unit.max)}
          onChange={(e) =>
            onChange({ max: e.target.value, unit_id: unit.unit_id })
          }
          className="h-8 bg-white text-sm"
        />
        {unit.symbol && (
          <span className="text-xs text-[#68736d]">{unit.symbol}</span>
        )}
      </div>
    </div>
  );
}
