import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';

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
      <ModalScrollShell size="sm">
        <div className="h-1 shrink-0 bg-amber-600" />
        <ModalScrollBody>
          <div className="flex gap-3">
            <AlertTriangle className="shrink-0 text-amber-700" size={22} />
            <div>
              <h2 className="text-base font-bold text-slate-900">Mark line as cleared?</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-zarewa-teal">{label}</span> — {formatNgn(item.amountNgn)} will be removed
                from the open register. Use only after settlement in live transactions, payroll, or GL.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 min-h-5 min-w-5"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              disabled={busy}
            />
            <span className="text-xs font-medium text-slate-700 leading-snug">
              I confirm this balance has been settled or written off in the live system.
            </span>
          </label>
        </ModalScrollBody>

        <ModalActionFooter
          onCancel={() => {
            setAck(false);
            onClose();
          }}
          cancelDisabled={busy}
          onConfirm={() => void onConfirm()}
          confirmLabel="Clear line"
          confirmDisabled={busy || !ack}
          confirmLoading={busy}
          confirmLoadingLabel="Clearing…"
        />
      </ModalScrollShell>
    </ModalFrame>
  );
}
