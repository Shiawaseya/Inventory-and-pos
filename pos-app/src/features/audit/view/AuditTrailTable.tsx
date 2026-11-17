import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useAuditLogsQuery } from "../queries/useAuditLogsQuery";
import type { AuditLogItem } from "../api/auditApi";
import AuditActionBadge from "../components/AuditActionBadge";
import AuditDiffModal from "../components/AuditDiffModal";
import AuditFilterBar from "../components/AuditFilterBar";

const columnHelper = createColumnHelper<AuditLogItem>();

export const AuditTrailTable: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [module, setModule] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data: response, isLoading } = useAuditLogsQuery({
    page,
    per_page: perPage,
    search,
    action,
    module,
  });

  const logs = useMemo(() => response?.data ?? [], [response]);
  const pagination = response?.pagination ?? {
    total_items: 0,
    total_pages: 1,
    current_page: 1,
    per_page: perPage,
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("created_at", {
        header: "Timestamp",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-500">
            {new Date(info.getValue()).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("employee_name", {
        header: "Actor",
        cell: (info) => (
          <span className="font-medium text-slate-800">
            {info.getValue() || "System"}
          </span>
        ),
      }),
      columnHelper.accessor("action", {
        header: "Action",
        cell: (info) => <AuditActionBadge action={info.getValue()} />,
      }),
      columnHelper.accessor("module", {
        header: "Module",
        cell: (info) => (
          <span className="text-slate-700 capitalize">
            {info.getValue()?.replace("_", " ")}
          </span>
        ),
      }),
      columnHelper.accessor("record_id", {
        header: "Record ID",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-500">
            {info.getValue() ? `#${info.getValue()}` : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("ip_address", {
        header: "IP Address",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-500">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "changes",
        header: "Changes",
        cell: ({ row }) => {
          const item = row.original;
          const hasDiff = Boolean(item.old_values || item.new_values);

          if (!hasDiff)
            return <span className="text-slate-300 text-xs">—</span>;

          return (
            <button
              onClick={() => setSelectedLog(item)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition"
            >
              View Diff
            </button>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: logs,
    columns,
    pageCount: pagination.total_pages,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="h-full flex flex-col space-y-4">
      <AuditFilterBar
        search={search}
        action={action}
        module={module}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onActionChange={(val) => {
          setAction(val);
          setPage(1);
        }}
        onModuleChange={(val) => {
          setModule(val);
          setPage(1);
        }}
        onReset={() => {
          setSearch("");
          setAction("");
          setModule("");
          setPage(1);
        }}
      />

      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-3.5">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-slate-400"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-slate-400"
                  >
                    No audit records found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
          <span className="text-slate-600">
            Page <strong>{pagination.current_page}</strong> of{" "}
            <strong>{pagination.total_pages}</strong> ({pagination.total_items}{" "}
            total logs)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(p + 1, pagination.total_pages))
              }
              disabled={page >= pagination.total_pages || isLoading}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AuditDiffModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditTrailTable;
