import React from "react";
import type { AuditAction } from "../api/auditApi";

interface AuditActionBadgeProps {
  action: AuditAction | string;
}

export const AuditActionBadge: React.FC<AuditActionBadgeProps> = ({
  action,
}) => {
  const styles: Record<string, string> = {
    CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
    DELETE: "bg-rose-50 text-rose-700 border-rose-200",
    STOCK_ADJUSTMENT: "bg-purple-50 text-purple-700 border-purple-200",
    PRICE_CHANGE: "bg-blue-50 text-blue-700 border-blue-200",
    LOGIN: "bg-sky-50 text-sky-700 border-sky-200",
    LOGOUT: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold border ${
        styles[action] || "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {action}
    </span>
  );
};

export default AuditActionBadge;
