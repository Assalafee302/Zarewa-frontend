import React from 'react';
import MaterialIncidentPrintView from './MaterialIncidentPrintView';

/** Full-screen print preview portal (quotation / cutting-list style). */
export default function MaterialIncidentPrintPortal({ payload, onClose }) {
  if (!payload) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close print"
        className="no-print fixed inset-0 z-[10000] bg-black/50"
        onClick={onClose}
      />
      <div className="print-portal-scroll fixed inset-0 z-[10001] overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-3xl quotation-print-preview-mode">
          <div className="quotation-print-a4 rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
            <MaterialIncidentPrintView payload={payload} />
          </div>
          <div className="no-print mt-4 flex justify-center gap-2">
            <button type="button" className="z-btn-primary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
            <button type="button" className="z-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
