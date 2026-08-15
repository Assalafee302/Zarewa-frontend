import React, { useState } from 'react';
import { Database, Download, Loader2 } from 'lucide-react';
import { downloadEnteredDataWorkbook } from '../../lib/enteredDataDownload.js';

/**
 * Full dump of records entered in the workspace — not limited to the selected period.
 */
export function ReportsEnteredDataPanel({ showToast, branchLabel }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const runDownload = async () => {
    setBusy(true);
    try {
      await downloadEnteredDataWorkbook(showToast);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="hidden sm:flex p-3 rounded-2xl bg-slate-50 text-zarewa-teal border border-slate-100 shrink-0">
          <Database size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-zarewa-teal tracking-tight">Download all entered data</h3>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            One Excel file of every customer, quotation, receipt, purchase order, expense, production job,
            delivery, refund, coil, and stock record currently stored
            {branchLabel ? ` for ${branchLabel}` : ''}. This is the full live register — it is not limited
            to the period above. HR payroll stays on HR Reports.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirm(true)}
          className="z-btn-primary justify-center min-h-10 w-full sm:w-auto"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {busy ? 'Building workbook…' : 'Download all data'}
        </button>
      </div>

      {confirm ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">Download the complete register?</p>
          <p className="text-xs text-amber-900 mt-1">
            Includes all records in this workspace, not just the selected period. File attachments and
            passwords are not included.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runDownload()}
              className="z-btn-primary !text-xs !py-2 min-h-10"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {busy ? 'Downloading…' : 'Yes, download'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(false)}
              className="z-btn-secondary !text-xs !py-2 min-h-10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
