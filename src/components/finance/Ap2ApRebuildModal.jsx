import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { InlineLoader } from '../ui/PageLoader';
import { Button } from '../ui/button';
import { FieldLabel, Textarea } from '../ui/Input';
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

  const canSubmitApply =
    mayApply &&
    approvalNote.trim() &&
    confirmed &&
    preview?.previewHash &&
    (preview.flags?.apReceivedBasisRebuildEnabled ?? true);

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      title="AP received-basis rebuild preview"
      surface="plain"
    >
      <ModalScrollShell size="xl">
        <div className="h-1 shrink-0 bg-teal-700" />
        <ModalScrollBody className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-teal-700 shrink-0 mt-1" size={22} />
            <div>
              <h2 className="text-lg font-black text-zarewa-teal">AP received-basis rebuild preview</h2>
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

          {loading && !preview ? <InlineLoader message="Loading preview…" /> : null}

          {preview?.status === 'preview_only' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-ui-xs font-bold uppercase text-slate-500">Current AP total</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.currentApNgn)}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                  <p className="text-ui-xs font-bold uppercase text-teal-800">Proposed (received)</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.proposedApTotalNgn)}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-ui-xs font-bold uppercase text-amber-800">Affected POs</p>
                  <p className="text-lg font-black tabular-nums">{s.affectedPoCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                  <p className="text-ui-xs font-bold uppercase text-rose-800">Supplier advance</p>
                  <p className="text-lg font-black tabular-nums">{formatNgn(s.supplierAdvanceNgn)}</p>
                </div>
                <div className="rounded-xl border border-amber-200 p-3">
                  <p className="text-ui-xs font-bold uppercase text-amber-800">Missing cost POs</p>
                  <p className="text-lg font-black tabular-nums">{s.missingCostCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-ui-xs font-bold uppercase text-slate-500">Manual AP skipped</p>
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
                  <div>
                    <FieldLabel htmlFor="ap-rebuild-note" required>
                      Approval note
                    </FieldLabel>
                    <Textarea
                      id="ap-rebuild-note"
                      rows={3}
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Document review of preview and business sign-off…"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    I confirm Head of Accounts has reviewed this preview
                  </label>
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
        </ModalScrollBody>

        <ModalActionFooter onCancel={onClose} cancelDisabled={applyLoading}>
          {mayApply ? (
            <Button
              type="button"
              onClick={() => void handleApply()}
              disabled={applyLoading || !canSubmitApply}
            >
              {applyLoading ? 'Applying…' : 'Approve received-basis AP rebuild'}
            </Button>
          ) : null}
        </ModalActionFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
