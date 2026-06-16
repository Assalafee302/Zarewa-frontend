import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame } from '../layout/ModalFrame';

/**
 * @param {{
 *   item: object | null;
 *   open: boolean;
 *   busy?: boolean;
 *   onClose: () => void;
 *   onConfirm: () => void | Promise<void>;
 * }} props
 */
export function AccountingRegisterClearModal({ item, open, busy, onClose, onConfirm }) {
  const [ack, setAck] = useState(false);

  if (!open || !item) return null;

  const label = item.partyName || item.reference || item.id;

  return (
    <ModalFrame
      isOpen={open}
      onClose={() => {
        if (!busy) {
          setAck(false);
          onClose();
        }
      }}
      title="Clear legacy register line"
      surface="plain"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-amber-600" />
        <div className="p-5 sm:p-6">
          <div className="flex gap-3">
            <AlertTriangle className="shrink-0 text-amber-700" size={22} />
            <div>
              <h2 className="text-base font-bold text-slate-900">Mark line as cleared?</h2>
              <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-[#134e4a]">{label}</span> — {formatNgn(item.amountNgn)} will be removed
                from the open register. Use only after settlement in live transactions, payroll, or GL.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              disabled={busy}
            />
            <span className="text-[10px] font-medium text-slate-700 leading-snug">
              I confirm this balance has been settled or written off in the live system.
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAck(false);
                onClose();
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !ack}
              onClick={() => void onConfirm()}
              className="rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {busy ? 'Clearing…' : 'Clear line'}
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
