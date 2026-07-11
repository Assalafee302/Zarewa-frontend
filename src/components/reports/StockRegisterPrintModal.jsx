import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StandardReportPrintShell } from './StandardReportPrintShell';
import { StockRegisterPrintContent } from './StockRegisterPrintContent';
import { STATUS_STEPS } from './stockRegister/stockRegisterConstants';

/**
 * Body-portaled print preview — matches ReceiptModal / QuotationModal so @media print
 * renders the same content as on-screen preview.
 */
export function StockRegisterPrintModal({
  open,
  onClose,
  register,
  branchId,
  branchLabel,
  workflow,
  autoPrint = false,
  viewMode = 'store',
}) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!open || !autoPrint || !register || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(t);
  }, [open, autoPrint, register]);

  useEffect(() => {
    if (!open) printedRef.current = false;
  }, [open]);

  if (!open || !register) return null;

  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const statusKey = workflow?.status || 'draft';
  const statusLabel =
    STATUS_STEPS.find((s) => s.key === statusKey)?.label ||
    String(statusKey).replace(/_/g, ' ');
  const isCountSheet = viewMode === 'store' || viewMode === 'manager';

  return (
    <PrintModalPortal open={open} onClose={onClose}>
      <div className="mx-auto max-w-5xl pb-16">
        {autoPrint ? (
          <p className="no-print mb-2 text-center text-sm font-medium text-teal-900">Preparing printer…</p>
        ) : null}
        <div className="report-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <StandardReportPrintShell
            documentTypeLabel="Month-end stock register"
            title={isCountSheet ? 'Physical count sheet' : 'Physical stock register'}
            subtitle={`Branch ${branchLabel || branchId} · Period ending ${register.periodEnd}`}
            rightColumn={
              <>
                <p>
                  <strong>Status:</strong> {statusLabel}
                </p>
                <p>
                  <strong>Preview:</strong> {generated}
                </p>
                <p>
                  <strong>Coil lines:</strong> {register.meta?.coilRowCount ?? '—'}
                </p>
                {isCountSheet ? (
                  <p>
                    <strong>Sheet:</strong> Blind count (sys close blank)
                  </p>
                ) : null}
              </>
            }
            shellClassName="max-w-[210mm]"
            footer={
              <p className="text-center text-ui-xs text-slate-500">
                Store confirm → BM clearance → Procurement costing → MD approve → Capture &amp; lock
              </p>
            }
          >
            <StockRegisterPrintContent
              register={register}
              branchId={branchId}
              branchLabel={branchLabel}
              viewMode={viewMode}
            />
          </StandardReportPrintShell>
        </div>
        <div className="no-print mt-4 flex flex-col items-center gap-2">
          <p className="text-ui-xs text-slate-500">Use landscape A4 for coil tables.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary py-2.5 px-4">
              <Printer size={16} />
              {isCountSheet ? 'Print count sheet' : 'Print'}
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary py-2.5 px-3" aria-label="Close">
              <X size={18} />
              Close
            </button>
          </div>
        </div>
      </div>
    </PrintModalPortal>
  );
}
