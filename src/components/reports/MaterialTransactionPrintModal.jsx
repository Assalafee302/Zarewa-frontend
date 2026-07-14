import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StatementStyleReportShell } from './StatementStyleReportShell';
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

  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <PrintModalPortal open={open} onClose={onClose}>
      <div className="mx-auto max-w-[297mm] pb-16">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="truncate text-sm font-bold text-zarewa-teal">Material transaction register</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary px-4 py-2.5">
              <Printer size={14} />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary px-3 py-2.5" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="report-print-root report-print-a4-landscape quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <StatementStyleReportShell
            title="Material transaction register"
            layout="landscape"
            metaLines={[
              { label: 'Branch', value: branchLabel || '—' },
              { label: 'Period', value: periodLabel || '—' },
              { label: 'Printed', value: generated },
              {
                label: 'Note',
                value:
                  'DD/MM dates; Qt and coil = last 4 digits. New coil / New roll on first use; Finished when coil clears. Amber before = gap vs previous after.',
              },
            ]}
          >
            <MaterialTransactionPrintContent report={report} />
          </StatementStyleReportShell>
        </div>
      </div>
    </PrintModalPortal>
  );
}
