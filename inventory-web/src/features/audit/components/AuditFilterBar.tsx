import React from "react";
import type { AuditAction, AuditModule } from "../api/auditApi";

interface AuditFilterBarProps {
  search: string;
  action: string;
  module: string;
  onSearchChange: (val: string) => void;
  onActionChange: (val: string) => void;
  onModuleChange: (val: string) => void;
  onReset: () => void;
}

const ACTION_OPTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STOCK_ADJUSTMENT",
  "PRICE_CHANGE",
  "SALE",
  "STOCK_IN",
  "STOCK_OUT",
  "LOGIN",
];

const MODULE_OPTIONS: AuditModule[] = [
  "inventory",
  "items",
  "item_variants",
  "branch_item",
  "stock_unit",
  "stock_adjustments",
  "sales",
  "customers",
  "employees",
  "brands",
  "categories",
];

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  search,
  action,
  module,
  onSearchChange,
  onActionChange,
  onModuleChange,
  onReset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <input
        type="text"
        placeholder="Search actor, record ID, or values..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
      />

      <select
        value={action}
        onChange={(e) => onActionChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Actions</option>
        {ACTION_OPTIONS.map((act) => (
          <option key={act} value={act}>
            {act}
          </option>
        ))}
      </select>

      <select
        value={module}
        onChange={(e) => onModuleChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Modules</option>
        {MODULE_OPTIONS.map((mod) => (
          <option key={mod} value={mod}>
            {mod.replace("_", " ").toUpperCase()}
          </option>
        ))}
      </select>

      <button
        onClick={onReset}
        className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition"
      >
        Reset
      </button>
    </div>
  );
};

export default AuditFilterBar;
