import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
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

  if (!open || !report) return null;

  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <PrintModalPortal open={open} onClose={onClose}>
      <div className="mx-auto max-w-[297mm] pb-16">
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
              <p className="text-center text-ui-xs text-slate-500">
                Aluminium · Aluzinc · Stone · Accessories · Summary
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
    </PrintModalPortal>
  );
}
