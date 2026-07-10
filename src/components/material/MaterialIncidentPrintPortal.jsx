import React, { useEffect } from 'react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
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

  if (!payload) return null;

  return (
    <PrintModalPortal open onClose={onClose}>
      <div className="mx-auto max-w-[210mm] pb-16 quotation-print-preview-mode">
        <div className="quotation-print-a4 rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <MaterialIncidentPrintView payload={payload} />
        </div>
        <div className="no-print mt-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-zarewa-teal px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-white shadow-lg"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-slate-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <p className="text-center text-ui-xs text-slate-500 max-w-sm">
            Keep a printed copy with your offcut register. Reference <span className="font-mono font-semibold">{payload.id}</span>{' '}
            on production complete and month-end stock counts.
          </p>
        </div>
      </div>
    </PrintModalPortal>
  );
}
