import React from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import type { AuditLogItem } from "../api/auditApi";

interface AuditDiffModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export const AuditDiffModal: React.FC<AuditDiffModalProps> = ({
  log,
  onClose,
}) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Audit Entry: <span className="capitalize">{log.module}</span>{" "}
              (Record #{log.record_id || "N/A"})
            </h3>
            <p className="text-xs text-slate-500">
              By {log.employee_name || "System"} on{" "}
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh] font-mono text-xs">
          <ReactDiffViewer
            oldValue={
              log.old_values ? JSON.stringify(log.old_values, null, 2) : ""
            }
            newValue={
              log.new_values ? JSON.stringify(log.new_values, null, 2) : ""
            }
            splitView={true}
            leftTitle="Before Change"
            rightTitle="After Change"
            compareMethod={DiffMethod.WORDS}
          />
        </div>
      </div>
    </div>
  );
};

export default AuditDiffModal;
