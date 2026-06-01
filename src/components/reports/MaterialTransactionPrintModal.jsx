import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { StandardReportPrintShell } from './StandardReportPrintShell';
import { MaterialTransactionPrintContent } from './MaterialTransactionPrintContent';

export function MaterialTransactionPrintModal({
  open,
  onClose,
  report,
  branchLabel,
  periodLabel,
  autoPrint = false,
}) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!open || !autoPrint || !report || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(t);
  }, [open, autoPrint, report]);

  useEffect(() => {
    if (!open) printedRef.current = false;
  }, [open]);

  if (!open || !report || typeof document === 'undefined') return null;

  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close print preview"
        className="no-print fixed inset-0 z-[11060] bg-black/50"
        onClick={onClose}
      />
      <div
        className="print-portal-scroll fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-2 sm:p-6"
        onClick={onClose}
      >
        <div className="mx-auto max-w-[297mm] pb-16" onClick={(e) => e.stopPropagation()}>
          <div className="report-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
            <StandardReportPrintShell
              documentTypeLabel="Material transaction register"
              title="Material transaction register"
              subtitle={periodLabel}
              rightColumn={
                <>
                  <p>
                    <strong>Branch:</strong> {branchLabel || '—'}
                  </p>
                  <p>
                    <strong>Generated:</strong> {generated}
                  </p>
                </>
              }
              shellClassName="max-w-[297mm]"
              footer={
                <p className="text-center text-[9px] text-slate-500">
                  Aluminium · Aluzinc · Stone-coated · Accessories · Not produced · Cancelled
                </p>
              }
            >
              <MaterialTransactionPrintContent report={report} branchLabel={branchLabel} periodLabel={periodLabel} />
            </StandardReportPrintShell>
            <div className="no-print flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" className="z-btn-secondary text-sm" onClick={onClose}>
                <X size={14} />
                Close
              </button>
              <button type="button" className="z-btn-primary text-sm" onClick={() => window.print()}>
                <Printer size={14} />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
