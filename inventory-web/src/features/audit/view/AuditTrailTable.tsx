import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useAuditLogsQuery } from "../queries/useAuditLogsQuery";
import type { AuditLogItem } from "../api/auditApi";
import AuditDiffModal from "../components/AuditDiffModal";
import AuditFilterBar from "../components/AuditFilterBar";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type Rec = Record<string, unknown>;

const asRecord = (v: unknown): Rec | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null;

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** role_id -> "Role ID", sales-oic -> "Sales Oic" */
const humanizeKey = (key: string) =>
  titleCase(key)
    .replace(/\bId\b/g, "ID")
    .replace(/\bIp\b/g, "IP");

const formatDateTime = (value: string | number | Date) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (
    typeof value === "string" &&
    /(_at|_time|time|date)$/i.test(key) &&
    !Number.isNaN(new Date(value).getTime())
  ) {
    return formatDateTime(value);
  }
  return String(value);
};

/** Fallback for older API responses: hide fields that only make sense to developers. */
const isTechnicalKey = (key: string) =>
  /(^|_)(id|key|uuid|token|operation|ip|ip_address|user_agent|action_time)$/i.test(
    key
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );

type ParsedChange = { label: string; from: string | null; to: string | null };
type DetailRow = { label: string; value: string };

/**
 * The API now sends plain-language fields next to the raw log. They are optional so
 * this screen keeps working if an older backend is still deployed.
 */
type FriendlyLog = AuditLogItem & {
  action_label?: string;
  module_label?: string;
  record_label?: string | null;
  headline?: string;
  changes?: ParsedChange[];
  details?: DetailRow[];
};

/** Fallback: compute before/after straight from old_values / new_values. */
const diffFromValues = (oldV: Rec | null, newV: Rec | null): ParsedChange[] => {
  const keys = Array.from(
    new Set([...Object.keys(oldV ?? {}), ...Object.keys(newV ?? {})]),
  );
  return keys
    .filter((k) => !isTechnicalKey(k))
    .filter((k) => JSON.stringify(oldV?.[k]) !== JSON.stringify(newV?.[k]))
    .map((k) => ({
      label: humanizeKey(k),
      from: oldV && k in oldV ? formatValue(k, oldV[k]) : null,
      to: newV && k in newV ? formatValue(k, newV[k]) : null,
    }));
};

/** Fallback: list saved values when the API did not send `details`. */
const detailsFromValues = (values: Rec | null): DetailRow[] =>
  Object.entries(values ?? {})
    .filter(([k]) => !isTechnicalKey(k))
    .map(([k, v]) => ({ label: humanizeKey(k), value: formatValue(k, v) }));

const actionLabel = (log: FriendlyLog) =>
  log.action_label || titleCase(String(log.action ?? "Activity").toLowerCase());

const areaLabel = (log: FriendlyLog) =>
  log.module_label || titleCase(String(log.module ?? "")) || "—";

const summaryText = (log: FriendlyLog, fallback: string) =>
  log.headline || log.description || fallback;

/* -------------------------------------------------------------------------- */
/*  Colors                                                                    */
/* -------------------------------------------------------------------------- */

type Tone = "green" | "slate" | "amber" | "red" | "blue";

const TONES: Record<Tone, { badge: string; banner: string }> = {
  green: {
    badge: "bg-emerald-100 text-emerald-700",
    banner: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  slate: {
    badge: "bg-slate-200 text-slate-700",
    banner: "border-slate-200 bg-slate-50 text-slate-700",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700",
    banner: "border-amber-200 bg-amber-50 text-amber-800",
  },
  red: {
    badge: "bg-red-100 text-red-700",
    banner: "border-red-200 bg-red-50 text-red-800",
  },
  blue: {
    badge: "bg-blue-100 text-blue-700",
    banner: "border-blue-200 bg-blue-50 text-blue-800",
  },
};

/** Green = good/start, amber = changed, red = removed or refused, blue = new. */
const ACTION_TONES: Record<string, Tone> = {
  CREATE: "blue",
  INSERT: "blue",
  SALE: "blue",
  UPDATE: "amber",
  PRICE_CHANGE: "amber",
  STOCK_ADJUSTMENT: "amber",
  STOCK_OUT: "amber",
  DELETE: "red",
  VOID: "red",
  REJECT: "red",
  LOGIN: "green",
  STOCK_IN: "green",
  ONBOARDING: "green",
  AUTHORIZE: "green",
  RESUME: "green",
  VERIFY: "green",
  LOGOUT: "slate",
};

const toneFor = (log: FriendlyLog): Tone =>
  ACTION_TONES[String(log.action ?? "").toUpperCase()] ?? "slate";

const ActionPill: React.FC<{ log: FriendlyLog }> = ({ log }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[toneFor(log)].badge}`}
  >
    {actionLabel(log)}
  </span>
);

/* -------------------------------------------------------------------------- */
/*  Dialog building blocks                                                    */
/* -------------------------------------------------------------------------- */

/** Native <dialog>: focus trap, Escape to close and backdrop come for free. */
const DialogShell: React.FC<{
  title: string;
  subtitle: string;
  icon: string;
  tone: Tone;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, tone, onClose, children }) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 p-4">
          <span
            aria-hidden
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${TONES[tone].badge}`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-sm font-bold text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

const Summary: React.FC<{ tone: Tone; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <p
    className={`rounded-lg border px-4 py-3 text-sm leading-6 ${TONES[tone].banner}`}
  >
    {children}
  </p>
);

const FieldList: React.FC<{
  title: string;
  rows: { label: string; value: React.ReactNode }[];
}> = ({ title, rows }) => (
  <section>
    <h4 className="mb-2 text-xs font-semibold text-slate-500">{title}</h4>
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-3 gap-3 px-3 py-2 text-sm"
        >
          <dt className="text-slate-500">{row.label}</dt>
          <dd className="col-span-2 break-words font-medium text-slate-800">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
    {children}
  </p>
);

type DialogProps = {
  log: FriendlyLog;
  onClose: () => void;
  /** Opens the technical before/after viewer for this entry. */
  onShowRaw?: () => void;
};

/**
 * Bottom of every dialog: who, when and where in plain words, with the
 * developer-only information tucked away until someone asks for it.
 */
const ContextSection: React.FC<{
  log: FriendlyLog;
  onShowRaw?: () => void;
}> = ({ log, onShowRaw }) => {
  const hasRawValues = Boolean(log.old_values || log.new_values);

  return (
    <>
      <FieldList
        title="Who and when"
        rows={[
          { label: "Done by", value: log.employee_name || "System" },
          { label: "When", value: formatDateTime(log.created_at) },
          { label: "Area", value: areaLabel(log) },
        ]}
      />
      <details className="rounded-lg border border-slate-200 text-sm">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">
          Technical information (for IT support)
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-3">
          <dl className="space-y-1 text-xs text-slate-600">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">Reference no.</dt>
              <dd>{log.record_id || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">Network address</dt>
              <dd>{log.ip_address || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">Device</dt>
              <dd className="break-all">{log.user_agent || "—"}</dd>
            </div>
          </dl>
          {onShowRaw && hasRawValues && (
            <button
              type="button"
              onClick={onShowRaw}
              className="rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:text-blue-800"
            >
              Show raw before &amp; after data
            </button>
          )}
        </div>
      </details>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  One dialog per action                                                     */
/* -------------------------------------------------------------------------- */

const LoginDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => {
  const nv = asRecord(log.new_values);
  return (
    <DialogShell
      title="Signed in"
      subtitle={formatDateTime(log.created_at)}
      icon="→"
      tone="green"
      onClose={onClose}
    >
      <Summary tone="green">
        <strong>{log.employee_name || "A user"}</strong> signed in to the
        system.
      </Summary>
      <FieldList
        title="Session"
        rows={[
          {
            label: "Role",
            value: nv?.role ? titleCase(String(nv.role)) : "—",
          },
          {
            label: "Signed in at",
            value: formatDateTime(String(nv?.action_time ?? log.created_at)),
          },
        ]}
      />
      <ContextSection log={log} onShowRaw={onShowRaw} />
    </DialogShell>
  );
};

const LogoutDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => {
  const nv = asRecord(log.new_values);
  return (
    <DialogShell
      title="Signed out"
      subtitle={formatDateTime(log.created_at)}
      icon="←"
      tone="slate"
      onClose={onClose}
    >
      <Summary tone="slate">
        <strong>{log.employee_name || "A user"}</strong> signed out. Their
        session has ended.
      </Summary>
      <FieldList
        title="Session"
        rows={[
          {
            label: "Role",
            value: nv?.role ? titleCase(String(nv.role)) : "—",
          },
          {
            label: "Signed out at",
            value: formatDateTime(String(nv?.action_time ?? log.created_at)),
          },
        ]}
      />
      <ContextSection log={log} onShowRaw={onShowRaw} />
    </DialogShell>
  );
};

const ChangeCard: React.FC<{ change: ParsedChange }> = ({ change }) => (
  <li className="rounded-lg border border-slate-200 p-3">
    <p className="mb-2 text-xs font-semibold text-slate-500">{change.label}</p>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {change.from === null ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          Empty before
        </span>
      ) : (
        <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 line-through decoration-red-300">
          {change.from}
        </span>
      )}
      <span aria-hidden className="text-slate-400">
        →
      </span>
      {change.to === null ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          Now empty
        </span>
      ) : (
        <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
          {change.to}
        </span>
      )}
    </div>
  </li>
);

const ChangeList: React.FC<{ changes: ParsedChange[] }> = ({ changes }) => (
  <section>
    <h4 className="mb-2 text-xs font-semibold text-slate-500">
      What changed ({changes.length})
    </h4>
    {changes.length === 0 ? (
      <EmptyNote>No specific changes were recorded for this update.</EmptyNote>
    ) : (
      <ul className="space-y-2">
        {changes.map((c, i) => (
          <ChangeCard key={`${c.label}-${i}`} change={c} />
        ))}
      </ul>
    )}
  </section>
);

const UpdateDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => {
  const changes =
    log.changes ??
    diffFromValues(asRecord(log.old_values), asRecord(log.new_values));

  return (
    <DialogShell
      title="Information changed"
      subtitle={formatDateTime(log.created_at)}
      icon="✎"
      tone="amber"
      onClose={onClose}
    >
      <Summary tone="amber">
        {summaryText(log, "Some information was changed.")}
      </Summary>
      <ChangeList changes={changes} />
      <ContextSection log={log} onShowRaw={onShowRaw} />
    </DialogShell>
  );
};

const DetailsList: React.FC<{
  rows: DetailRow[];
  title?: string;
  empty?: string;
}> = ({ rows, title = "Details", empty = "" }) => {
  if (rows.length === 0) {
    return empty ? <EmptyNote>{empty}</EmptyNote> : null;
  }
  return <FieldList title={title} rows={rows} />;
};

const CreateDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => (
  <DialogShell
    title="New item added"
    subtitle={formatDateTime(log.created_at)}
    icon="+"
    tone="blue"
    onClose={onClose}
  >
    <Summary tone="blue">{summaryText(log, "A new item was added.")}</Summary>
    <DetailsList
      rows={log.details ?? detailsFromValues(asRecord(log.new_values))}
      empty="No further information was saved with this entry."
    />
    <ContextSection log={log} onShowRaw={onShowRaw} />
  </DialogShell>
);

const DeleteDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => (
  <DialogShell
    title="Item removed"
    subtitle={formatDateTime(log.created_at)}
    icon="🗑"
    tone="red"
    onClose={onClose}
  >
    <Summary tone="red">{summaryText(log, "An item was removed.")}</Summary>
    <section>
      <p className="mb-2 text-xs text-slate-500">
        Information that was saved before it was removed:
      </p>
      <DetailsList
        rows={log.details ?? detailsFromValues(asRecord(log.old_values))}
        empty="No earlier information was saved with this entry."
      />
    </section>
    <ContextSection log={log} onShowRaw={onShowRaw} />
  </DialogShell>
);

/** Used for any action without a dedicated dialog (stock, sales, approvals, ...). */
const GenericDialog: React.FC<DialogProps> = ({ log, onClose, onShowRaw }) => {
  const tone = toneFor(log);
  const changes = log.changes ?? [];
  const details = log.details ?? [
    ...detailsFromValues(asRecord(log.old_values)),
    ...detailsFromValues(asRecord(log.new_values)),
  ];

  return (
    <DialogShell
      title={actionLabel(log)}
      subtitle={formatDateTime(log.created_at)}
      icon="i"
      tone={tone}
      onClose={onClose}
    >
      <Summary tone={tone}>
        {summaryText(log, "No description available.")}
      </Summary>
      {changes.length > 0 && <ChangeList changes={changes} />}
      <DetailsList rows={details} />
      <ContextSection log={log} onShowRaw={onShowRaw} />
    </DialogShell>
  );
};

const DIALOGS: Record<string, React.FC<DialogProps>> = {
  LOGIN: LoginDialog,
  LOGOUT: LogoutDialog,
  CREATE: CreateDialog,
  INSERT: CreateDialog,
  UPDATE: UpdateDialog,
  DELETE: DeleteDialog,
};

/** Picks the right dialog for the log's action. */
const AuditDescriptionDialog: React.FC<{
  log: FriendlyLog | null;
  onClose: () => void;
  onShowRaw: () => void;
}> = ({ log, onClose, onShowRaw }) => {
  if (!log) return null;
  const Dialog =
    DIALOGS[String(log.action ?? "").toUpperCase()] ?? GenericDialog;
  // key remounts the <dialog> when switching between entries
  return (
    <Dialog
      key={log.audit_id}
      log={log}
      onClose={onClose}
      onShowRaw={onShowRaw}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

const columnHelper = createColumnHelper<FriendlyLog>();

export const AuditTrailTable: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [module, setModule] = useState<string>("");
  // Technical before/after viewer (kept for IT support).
  const [selectedLog, setSelectedLog] = useState<FriendlyLog | null>(null);
  // Plain-language details dialog.
  const [selectedDescription, setSelectedDescription] =
    useState<FriendlyLog | null>(null);

  const { data: response, isLoading } = useAuditLogsQuery({
    page,
    per_page: perPage,
    search,
    action,
    module,
  });

  const logs = useMemo(
    () => (response?.data ?? []) as FriendlyLog[],
    [response],
  );
  const pagination = response?.pagination ?? {
    total_items: 0,
    total_pages: 1,
    current_page: 1,
    per_page: perPage,
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("created_at", {
        header: "When",
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-slate-600">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("employee_name", {
        header: "Who",
        cell: (info) => (
          <span className="font-medium text-slate-800">
            {info.getValue() || "System"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "action",
        header: "Action",
        cell: ({ row }) => <ActionPill log={row.original} />,
      }),
      columnHelper.display({
        id: "area",
        header: "Area",
        cell: ({ row }) => (
          <span className="text-slate-700">{areaLabel(row.original)}</span>
        ),
      }),
      columnHelper.display({
        id: "summary",
        header: "What happened",
        cell: ({ row }) => (
          <span className="block max-w-md text-slate-700">
            {summaryText(row.original, "—")}
          </span>
        ),
      }),
      columnHelper.display({
        id: "details",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedDescription(row.original)}
            className="whitespace-nowrap rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            View details
          </button>
        ),
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
                    Loading activity...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-slate-400"
                  >
                    No activity found. Try changing or clearing the filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3.5 align-top">
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
            entries in total)
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
      <AuditDescriptionDialog
        log={selectedDescription}
        onClose={() => setSelectedDescription(null)}
        onShowRaw={() => {
          // Close the friendly dialog first so the two modals never stack.
          setSelectedLog(selectedDescription);
          setSelectedDescription(null);
        }}
      />
    </div>
  );
};

export default AuditTrailTable;
