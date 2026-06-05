import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDataTable } from './FinanceDataTable';

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   preview: object | null;
 *   loading?: boolean;
 *   error?: string;
 *   mayApply?: boolean;
 *   onApply?: (payload: object) => Promise<object | null>;
 *   applyLoading?: boolean;
 *   applyError?: string;
 *   branchId?: string;
 *   period?: string;
 *   supplierId?: string;
 *   status?: string;
 * }} props
 */
export function Ap2ApRebuildModal({
  open,
  onClose,
  preview,
  loading,
  error,
  mayApply = false,
  onApply,
  applyLoading,
  applyError,
  branchId = 'ALL',
  period = '',
  supplierId = '',
  status = '',
}) {
  const [approvalNote, setApprovalNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const s = preview?.summary || {};
  const affected = (preview?.rows || []).filter((r) => r.rebuildEligible && r.apDifferenceNgn !== 0);

  const tableRows = affected.slice(0, 40).map((r) => ({
    _key: r.poId,
    po: r.poId,
    supplier: r.supplierName || r.supplierRef || '—',
    current: formatNgn(r.currentApNgn),
    proposed: formatNgn(r.proposedApNgn),
    diff: formatNgn(r.apDifferenceNgn),
    flags: (r.riskFlags || []).join(' · ') || '—',
  }));

  const handleApply = async () => {
    if (!onApply || !preview?.previewHash) return;
    const result = await onApply({
      branchId,
      period: period || undefined,
      supplierId: supplierId || undefined,
      status: status || undefined,
      confirmPreviewHash: preview.previewHash,
      approvalNote: approvalNote.trim(),
      dryRunAccepted: confirmed,
    });
    if (result?.ok) {
      setApprovalNote('');
      setConfirmed(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="ap2-rebuild-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 pr-8">
            <ShieldCheck className="text-teal-700 shrink-0 mt-1" size={22} />
            <div>
              <h2 id="ap2-rebuild-title" className="text-lg font-black text-[#134e4a]">
                AP received-basis rebuild preview
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {preview?.disclaimer || 'Preview only. No AP values were changed yet.'}
              </p>
              {preview?.apBasisNote ? (
                <p className="text-xs font-bold text-amber-800 mt-2">{preview.apBasisNote}</p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </p>
          ) : null}
          {applyError ? (
            <p className="text-sm text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} />
              {applyError}
            </p>
          ) : null}

          {loading && !preview ? (
            <p className="text-sm text-violet-800">Loading preview…</p>
          ) : null}

          {preview?.status === 'preview_only' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Current AP total</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.currentApNgn)}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-teal-800">Proposed (received)</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.proposedApTotalNgn)}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-amber-800">Affected POs</p>
                  <p className="text-lg font-black tabular-nums">{s.affectedPoCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-rose-800">Supplier advance</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.supplierAdvanceNgn)}</p>
                </div>
                <div className="rounded-xl border border-amber-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-amber-800">Missing cost POs</p>
                  <p className="text-lg font-black tabular-nums">{s.missingCostCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Manual AP skipped</p>
                  <p className="text-lg font-black tabular-nums">{s.manualApSkippedCount ?? 0}</p>
                </div>
              </div>

              {tableRows.length ? (
                <FinanceDataTable
                  columns={[
                    { key: 'po', label: 'PO' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'current', label: 'Current AP', align: 'right' },
                    { key: 'proposed', label: 'Proposed', align: 'right' },
                    { key: 'diff', label: 'Δ amount', align: 'right' },
                    { key: 'flags', label: 'Flags' },
                  ]}
                  rows={tableRows}
                />
              ) : (
                <p className="text-sm text-slate-600">No PO rows need amount changes in this scope.</p>
              )}

              {mayApply ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-600">Head of Accounts approval</p>
                  <label className="block text-sm font-medium text-slate-700">
                    Approval note (required)
                    <textarea
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      rows={3}
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Document review of preview and business sign-off…"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    I confirm Head of Accounts has reviewed this preview
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <FinanceActionButton
                      variant="primary"
                      onClick={() => void handleApply()}
                      disabled={
                        applyLoading ||
                        !approvalNote.trim() ||
                        !confirmed ||
                        !preview.previewHash ||
                        !(preview.flags?.apReceivedBasisRebuildEnabled ?? true)
                      }
                    >
                      Approve received-basis AP rebuild
                    </FinanceActionButton>
                    <FinanceActionButton variant="secondary" onClick={onClose}>
                      Cancel
                    </FinanceActionButton>
                  </div>
                  {preview.flags && !preview.flags.apReceivedBasisRebuildEnabled ? (
                    <p className="text-xs text-amber-800 font-bold">
                      Rebuild disabled until AP_RECEIVED_BASIS_REBUILD_ENABLED=1 on server.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  Preview only for your role. Head of Accounts must apply rebuild.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
