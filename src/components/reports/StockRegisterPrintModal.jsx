import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { StandardReportPrintShell } from './StandardReportPrintShell';
import { StockRegisterPrintContent } from './StockRegisterPrintContent';

/**
 * Body-portaled print preview — matches ReceiptModal / QuotationModal so @media print
 * renders the same content as on-screen preview.
 */
export function StockRegisterPrintModal({ open, onClose, register, branchId, branchLabel, workflow, autoPrint = false }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!open || !autoPrint || !register || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(t);
  }, [open, autoPrint, register]);

  useEffect(() => {
    if (!open) printedRef.current = false;
  }, [open]);

  if (!open || !register || typeof document === 'undefined') return null;

  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const status = workflow?.status ? String(workflow.status).replace(/_/g, ' ').toUpperCase() : 'DRAFT';

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close print preview"
        className="no-print fixed inset-0 z-[11060] bg-black/50"
        onClick={onClose}
      />
      <div
        className="print-portal-scroll fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-4 sm:p-8"
        onClick={onClose}
      >
        <div className="mx-auto max-w-5xl pb-16" onClick={(e) => e.stopPropagation()}>
          <div className="report-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
            <StandardReportPrintShell
              documentTypeLabel="Month-end stock register"
              title="Physical stock register"
              subtitle={`Branch ${branchLabel || branchId} · Period ending ${register.periodEnd}`}
              rightColumn={
                <>
                  <p>
                    <strong>Status:</strong> {status}
                  </p>
                  <p>
                    <strong>Preview:</strong> {generated}
                  </p>
                  <p>
                    <strong>Coil lines:</strong> {register.meta?.coilRowCount ?? '—'}
                  </p>
                </>
              }
              shellClassName="max-w-[210mm]"
              footer={
                <p className="text-center text-[9px] text-slate-500">
                  Store · Branch Manager · MD sign-off required before capture closing.
                </p>
              }
            >
              <StockRegisterPrintContent register={register} branchId={branchId} branchLabel={branchLabel} />
            </StandardReportPrintShell>
          </div>
          <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary py-2.5 px-4">
              <Printer size={16} />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary py-2.5 px-3" aria-label="Close">
              <X size={18} />
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
