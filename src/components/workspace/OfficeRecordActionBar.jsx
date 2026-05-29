import React from 'react';
import { ArrowLeftRight, Check, Printer, RotateCcw, XCircle } from 'lucide-react';

/**
 * Sticky action toolbar for office record detail (prints, endorse, return, convert, close).
 */
export default function OfficeRecordActionBar({
  actions,
  onFileRecord,
  onConvertExpense,
  onEditBm,
  canFile,
}) {
  if (!actions) return null;
  const {
    busy,
    canEndorse,
    canReturn,
    showClose,
    canConvertExpense,
    canConvertProcurement,
    canEditBm,
    endorse,
    returnForInfo,
    closeRecord,
    printThreadView,
    printInternalMemoPack,
    submitProcurementConvert,
  } = actions;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="toolbar"
      aria-label="Office record actions"
      data-office-record-action-bar
    >
      {canEndorse ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void endorse()}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Check size={14} aria-hidden />
          Endorse
        </button>
      ) : null}
      {canReturn ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void returnForInfo()}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
        >
          <RotateCcw size={14} aria-hidden />
          Return
        </button>
      ) : null}
      {canConvertExpense ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onConvertExpense?.()}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
        >
          <ArrowLeftRight size={14} aria-hidden />
          Convert to expense
        </button>
      ) : null}
      {canConvertProcurement ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitProcurementConvert()}
          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 disabled:opacity-50"
        >
          <ArrowLeftRight size={14} aria-hidden />
          Convert to procurement
        </button>
      ) : null}
      {canEditBm ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEditBm?.()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          Edit before endorsement
        </button>
      ) : null}
      {canFile ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onFileRecord?.()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          File record
        </button>
      ) : null}
      {showClose ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void closeRecord()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
        >
          <XCircle size={14} aria-hidden />
          Close
        </button>
      ) : null}
      <button
        type="button"
        onClick={printThreadView}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        <Printer size={14} aria-hidden />
        Print
      </button>
      <button
        type="button"
        onClick={printInternalMemoPack}
        className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"
      >
        <Printer size={14} aria-hidden />
        A4 pack
      </button>
    </div>
  );
}
