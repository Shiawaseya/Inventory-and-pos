import React from "react";
import { AuditTrailTable } from "@/features/audit";

export default function AuditTrailPage() {
  return (
    <div className="h-full w-full flex flex-col p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Trail</h1>
        <p className="text-xs text-slate-500">
          Security event logs and historical data changes
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <AuditTrailTable />
      </div>
    </div>
  );
}
