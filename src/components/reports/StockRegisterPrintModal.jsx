import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StatementStyleReportShell } from './StatementStyleReportShell';
import { StockRegisterPrintContent } from './StockRegisterPrintContent';
import { STATUS_STEPS } from './stockRegister/stockRegisterConstants';
import { formatStockRegisterMonth, stockRegisterStepIndex } from '../../lib/stockRegisterPeriod';

/**
 * Body-portaled print preview — statement-style (matches Finance account statement).
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

  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  const statusKey = workflow?.status || 'draft';
  const stepIdx = stockRegisterStepIndex(statusKey, STATUS_STEPS);
  const statusLabel =
    (stepIdx >= 0 ? STATUS_STEPS[stepIdx]?.label : null) ||
    String(statusKey).replace(/_/g, ' ');
  const isCountSheet = viewMode === 'store' || viewMode === 'manager';
  const monthLabel = formatStockRegisterMonth(register.periodEnd);
  const title = isCountSheet ? 'Physical count sheet' : 'Physical stock register';

  return (
    <PrintModalPortal open={open} onClose={onClose}>
      <div className="mx-auto max-w-[297mm] pb-16">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="truncate text-sm font-bold text-zarewa-teal">{title}</p>
            {autoPrint ? (
              <p className="mt-0.5 text-xs font-medium text-teal-900">Preparing printer…</p>
            ) : (
              <p className="mt-0.5 text-ui-xs text-slate-500">Landscape A4 recommended for coil tables.</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary px-4 py-2.5">
              <Printer size={16} />
              {isCountSheet ? 'Print count sheet' : 'Print'}
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary px-3 py-2.5" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="report-print-root report-print-a4-landscape quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <StatementStyleReportShell
            title={title}
            layout="landscape"
            metaLines={[
              { label: 'Branch', value: branchLabel || branchId || '—' },
              { label: 'Period', value: monthLabel },
              { label: 'Status', value: statusLabel },
              { label: 'Printed', value: generated },
              { label: 'Coil lines', value: String(register.meta?.coilRowCount ?? '—') },
              isCountSheet
                ? { label: 'Sheet', value: 'Blind count (sys close blank)' }
                : null,
              {
                label: 'Workflow',
                value: 'Store confirm → BM clearance → Procurement costing → Capture & lock',
              },
            ].filter(Boolean)}
          >
            <StockRegisterPrintContent
              register={register}
              branchId={branchId}
              branchLabel={branchLabel}
              viewMode={viewMode}
            />
          </StatementStyleReportShell>
        </div>
      </div>
    </PrintModalPortal>
  );
}
