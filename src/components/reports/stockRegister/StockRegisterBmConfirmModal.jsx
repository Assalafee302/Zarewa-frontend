import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ModalFrame } from '../../layout';
import { formatStockRegisterMonth } from '../../../lib/stockRegisterPeriod';
import {
  buildAdjustmentsFromClearance,
  computeClearanceProgress,
  enumerateRegisterLineKeys,
  roundKg,
} from '../../../lib/stockRegisterLineClearance';

/**
 * Executive confirmation dialog for Branch Manager monthly stock review sign-off.
 * Gives the manager a crisp executive summary, attestation checklist, and handover remarks
 * before passing the register to Head of Procurement for net kg costing.
 */
export function StockRegisterBmConfirmModal({
  open,
  onClose,
  register,
  workflow,
  periodKey,
  periodEnd,
  branchLabel,
  lineClearance,
  onConfirm,
  submitting = false,
}) {
  const [attestCount, setAttestCount] = useState(false);
  const [attestMex, setAttestMex] = useState(false);
  const [managerRemarks, setManagerRemarks] = useState(
    () => workflow?.countNotes || ''
  );

  const monthLabel = formatStockRegisterMonth(periodEnd || periodKey);

  const allItems = useMemo(
    () => enumerateRegisterLineKeys(register),
    [register]
  );

  const progress = useMemo(
    () => computeClearanceProgress(register, lineClearance),
    [register, lineClearance]
  );

  const adjustments = useMemo(
    () => buildAdjustmentsFromClearance(register, lineClearance),
    [register, lineClearance]
  );

  const { coilAdjustments, stoneAdjustments, accessoryAdjustments } = useMemo(() => {
    return {
      coilAdjustments: adjustments.coilLines || [],
      stoneAdjustments: adjustments.stoneLines || [],
      accessoryAdjustments: adjustments.accessoryLines || [],
    };
  }, [adjustments]);

  const totalAdjustedLines =
    coilAdjustments.length + stoneAdjustments.length + accessoryAdjustments.length;

  // Calculate net kg variance across adjusted coils
  const netKgVariance = useMemo(() => {
    let diff = 0;
    const itemMap = new Map(
      allItems
        .filter((it) => it.kind === 'coil')
        .map((it) => [it.row?.coilNo, it.row?.closingKg])
    );
    for (const ca of coilAdjustments) {
      const sysKg = itemMap.get(ca.coilNo);
      if (sysKg != null && ca.closingKg != null) {
        diff += roundKg(ca.closingKg) - roundKg(sysKg);
      }
    }
    return diff;
  }, [allItems, coilAdjustments]);

  // Collect unique MEX IDs
  const mexIds = useMemo(() => {
    const set = new Set();
    coilAdjustments.forEach((l) => l.materialExceptionId && set.add(l.materialExceptionId));
    stoneAdjustments.forEach((l) => l.materialExceptionId && set.add(l.materialExceptionId));
    accessoryAdjustments.forEach((l) => l.materialExceptionId && set.add(l.materialExceptionId));
    return Array.from(set);
  }, [coilAdjustments, stoneAdjustments, accessoryAdjustments]);

  const canSubmit = attestCount && (!totalAdjustedLines || attestMex) && !submitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm?.({ managerNotes: managerRemarks });
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      surface="plain"
      title="Confirm Branch Manager Stock Review"
      showCloseButton={false}
    >
      <div className="z-modal-panel-lg flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-zarewa-teal">
              <ShieldCheck size={22} className="text-teal-700" />
            </div>
            <div>
              <p className="text-ui-xs font-black uppercase tracking-wider text-teal-800">
                Stage 2 of 4 · Sign-off Gate
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                Confirm Branch Manager Stock Sign-Off
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-semibold text-slate-800">{branchLabel || 'Branch'}</span>
                {' · '}
                <span>{monthLabel} Physical Inventory Review</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="z-btn-secondary p-2 text-slate-400 hover:text-slate-700"
            aria-label="Close"
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Lines
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                {progress.total}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">100% reviewed</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Exact Matches
              </p>
              <p className="text-xl font-black text-emerald-900 mt-0.5 tabular-nums">
                {progress.cleared}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Physical = System</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Adjusted Lines
              </p>
              <p className="text-xl font-black text-amber-900 mt-0.5 tabular-nums">
                {progress.adjusted}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {totalAdjustedLines > 0 ? `${mexIds.length} MEX attached` : 'No variances'}
              </p>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Net Coil Variance
              </p>
              <p className="text-xl font-black text-teal-950 mt-0.5 tabular-nums">
                {netKgVariance > 0 ? `+${netKgVariance}` : netKgVariance} kg
              </p>
              <p className="text-[11px] text-teal-700 mt-0.5">Floor vs System</p>
            </div>
          </div>

          {/* Variance Breakdown if any lines adjusted */}
          {totalAdjustedLines > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-950">
                <Scale size={16} className="text-amber-700 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Weight Variances &amp; Material Exceptions
                </h4>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                The physical count identified {totalAdjustedLines} line{totalAdjustedLines === 1 ? '' : 's'} with weight differences.
                All adjustments are supported by recorded Material Exception (MEX) ticket numbers:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mexIds.length ? (
                  mexIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-mono font-bold text-amber-950 shadow-xs"
                    >
                      <FileCheck2 size={12} className="text-amber-700" />
                      {id}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-rose-700 font-semibold">
                    Warning: Discrepancies exist without MEX IDs.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <p className="text-xs text-emerald-900 font-medium">
                Perfect reconciliation: All physical yard counts match system closing stock with 0 discrepancies.
              </p>
            </div>
          )}

          {/* Process Timeline */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <h4 className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
              Ceremony Handover Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-200 bg-white p-2.5">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-800">
                    ✓
                  </span>
                  1. Store Yard Count
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Blind count sheets completed on floor
                </p>
              </div>

              <div className="rounded-lg border border-teal-300 bg-teal-50/70 p-2.5 shadow-xs ring-1 ring-teal-200">
                <p className="font-bold text-teal-950 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zarewa-teal text-[10px] text-white">
                    2
                  </span>
                  2. Branch Manager Review
                </p>
                <p className="text-[11px] text-teal-800 mt-1">
                  Line clearance &amp; variance audit (Now)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">
                    3
                  </span>
                  3. Procurement Costing
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Net kg pricing &amp; final period lock
                </p>
              </div>
            </div>
          </div>

          {/* Attestation Checkboxes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
              Branch Manager Attestation
            </h4>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={attestCount}
                onChange={(e) => setAttestCount(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal/20"
              />
              <span className="text-xs text-slate-700 leading-relaxed group-hover:text-slate-900">
                I confirm that the physical stock count for <strong>{branchLabel}</strong> has been
                independently cross-checked against production records and coil yard storage bays.
              </span>
            </label>

            {totalAdjustedLines > 0 ? (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={attestMex}
                  onChange={(e) => setAttestMex(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal/20"
                />
                <span className="text-xs text-slate-700 leading-relaxed group-hover:text-slate-900">
                  I confirm that all {totalAdjustedLines} weight adjustments are supported by verified Material
                  Exception (MEX) tickets and legitimate shop floor variances.
                </span>
              </label>
            ) : null}
          </div>

          {/* Manager Handover Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Manager Handover Notes (Optional)
            </label>
            <textarea
              className="z-input w-full min-h-[4rem] text-xs leading-relaxed"
              placeholder="e.g. Physical inventory verified with Store Officer. Minor tail offcut observed on coil CL-104."
              value={managerRemarks}
              onChange={(e) => setManagerRemarks(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[11px] text-slate-500">
              These notes will be passed to Head of Procurement and Executive Office on sign-off.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
          <button
            type="button"
            className="z-btn-secondary text-xs"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel &amp; Return to Review
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="z-btn-primary text-xs inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting Sign-Off…
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Confirm &amp; Send to Procurement
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
