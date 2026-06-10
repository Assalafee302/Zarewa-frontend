import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import MaterialIncidentPrintView from './MaterialIncidentPrintView';

/** Full-screen print preview portaled to document.body (above Radix modals). */
export default function MaterialIncidentPrintPortal({ payload, onClose }) {
  useEffect(() => {
    if (!payload) return undefined;
    const tag = () => document.documentElement.setAttribute('data-print-material-incident', '');
    const clear = () => document.documentElement.removeAttribute('data-print-material-incident');
    window.addEventListener('beforeprint', tag);
    window.addEventListener('afterprint', clear);
    return () => {
      window.removeEventListener('beforeprint', tag);
      window.removeEventListener('afterprint', clear);
      clear();
    };
  }, [payload]);

  if (!payload || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close print"
        className="no-print fixed inset-0 z-[11060] bg-black/50"
        onClick={onClose}
      />
      <div
        className="print-portal-scroll fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-4 sm:p-8"
        onClick={onClose}
      >
        <div
          className="mx-auto max-w-[210mm] pb-16 quotation-print-preview-mode"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="quotation-print-a4 rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
            <MaterialIncidentPrintView payload={payload} />
          </div>
          <div className="no-print mt-4 flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#134e4a] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            <p className="text-center text-[9px] text-slate-500 max-w-sm">
              Keep a printed copy with your offcut register. Reference <span className="font-mono font-semibold">{payload.id}</span>{' '}
              on production complete and month-end stock counts.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
