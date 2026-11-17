import { AlertCircle, Loader2, Search, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceReportLookupProps = {
  value: string;
  isLoading: boolean;
  error: Error | null;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
};

export function ServiceReportLookup({
  value,
  isLoading,
  error,
  onChange,
  onSearch,
  onClear,
}: ServiceReportLookupProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="service-report-lookup" className="text-sm font-medium">
          Serial number or invoice number
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="service-report-lookup"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSearch();
                }
              }}
              placeholder="SN-864164 or INV-20261005044530-5033"
              disabled={isLoading}
              autoComplete="off"
              className="h-10 pl-9 pr-9 font-mono text-sm"
            />
            {value && !isLoading && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            onClick={onSearch}
            disabled={isLoading || !value.trim()}
            className="h-10 gap-2 px-5"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying
              </>
            ) : (
              "Verify unit"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">
            {error.message || "No matching sold unit or invoice was found."}
          </AlertDescription>
        </Alert>
      ) : (
        !isLoading && (
          <p className="text-xs text-muted-foreground">
            Use the unit's serial number or the original sales invoice number.
            The customer and purchase details fill in automatically.
          </p>
        )
      )}
    </div>
  );
}
