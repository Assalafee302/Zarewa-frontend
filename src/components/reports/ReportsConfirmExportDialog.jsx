import React from 'react';
import { ModalFrame } from '../layout';
import { formatPeriodLabel } from '../../lib/reportsExportCatalog.js';

/**
 * Confirm period/branch before generating an export.
 */
export function ReportsConfirmExportDialog({
  open,
  onClose,
  onConfirm,
  itemTitle,
  formatLabel,
  startDate,
  endDate,
  branchLabel,
  busy,
}) {
  if (!open) return null;

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      title="Confirm export"
      description="Confirm period and branch before download"
      surface="plain"
      showCloseButton={false}
    >
      <div className="z-modal-panel-lg flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-zarewa-teal">Confirm export</h2>
          <p className="text-sm text-slate-600 mt-1">
            {itemTitle}
            {formatLabel ? ` · ${formatLabel}` : ''}
          </p>
        </div>
        <div className="px-5 py-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold text-slate-500">Period</span>
            <br />
            <span className="font-bold text-slate-900">{formatPeriodLabel(startDate, endDate)}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-500">Branch</span>
            <br />
            <span className="font-bold text-slate-900">{branchLabel || 'Current workspace'}</span>
          </p>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="z-btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : 'Generate'}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
