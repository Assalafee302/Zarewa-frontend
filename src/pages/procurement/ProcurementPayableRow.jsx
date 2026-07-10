import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { CARD_ROW } from './procurementTabShared.js';

export function ProcurementPayableRow({
  p,
  todayIso,
  branchNameById,
  canRecordSupplierPayment,
  wsCanMutate,
  onOpenPreview,
  onOpenPay,
}) {
  const paid = Number(p.paidNgn) || 0;
  const amt = Number(p.amountNgn) || 0;
  const outstanding = Math.max(0, amt - paid);
  const due = p.dueDateISO && String(p.dueDateISO).trim() && p.dueDateISO < todayIso;
  const open = paid < amt;
  const meta2 = [
    `PO ${p.poRef}`,
    p.invoiceRef ? `Ref ${p.invoiceRef}` : null,
    p.dueDateISO ? `Due ${p.dueDateISO}` : null,
    p.branchId ? branchNameById[p.branchId] || p.branchId : null,
    due && open ? 'Past due' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li
      className={`${CARD_ROW} cursor-pointer`}
      onClick={() => onOpenPreview?.()}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 leading-tight flex-1">
          <p className="text-xs font-bold text-zarewa-teal truncate uppercase">
            {p.apID}
            <span className="font-medium text-slate-600 normal-case"> · {p.supplierName}</span>
          </p>
          <p className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
            {meta2}
          </p>
          {open ? (
            <p className="text-ui-xs text-slate-600 mt-1 tabular-nums">
              {formatNgn(amt)} · Paid {formatNgn(paid)} ·{' '}
              <span className="font-bold text-amber-900">Due {formatNgn(outstanding)}</span>
            </p>
          ) : (
            <p className="text-ui-xs text-emerald-800 mt-1 tabular-nums font-semibold">
              Settled · {formatNgn(amt)} paid in full
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-zarewa-teal tabular-nums text-right">
            {open ? (
              <>
                <span className="block text-ui-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Outstanding
                </span>
                {formatNgn(outstanding)}
              </>
            ) : (
              formatNgn(amt)
            )}
          </span>
          {open ? (
            <button
              type="button"
              disabled={!wsCanMutate || !canRecordSupplierPayment}
              onClick={(e) => {
                e.stopPropagation();
                if (!canRecordSupplierPayment) return;
                onOpenPay();
              }}
              className="text-ui-xs font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md disabled:opacity-40"
            >
              Pay
            </button>
          ) : (
            <span className="text-ui-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800">
              Paid
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
