import { Badge } from "@/components/ui/badge";

type ServiceReportStatusBadgeProps = {
  certified: boolean;
  className?: string;
};

export function ServiceReportStatusBadge({
  certified,
  className = "",
}: ServiceReportStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 bg-background font-normal ${className}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          certified ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {certified ? "Certified" : "Awaiting certification"}
    </Badge>
  );
}
