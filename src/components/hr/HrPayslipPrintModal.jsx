import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { StandardReportPrintShell } from '../reports/StandardReportPrintShell';
import { formatNgn } from '../../lib/hrFormat';
import { downloadSinglePayslipPdf, formatPeriodYyyymm } from '../../lib/hrPayroll';

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   payslip: {
 *     runId: string;
 *     userId?: string;
 *     periodYyyymm: string;
 *     runStatus?: string;
 *     displayName?: string;
 *     grossNgn?: number | null;
 *     bonusNgn?: number | null;
 *     attendanceDeductionNgn?: number | null;
 *     otherDeductionNgn?: number | null;
 *     taxNgn?: number | null;
 *     pensionNgn?: number | null;
 *     netNgn?: number | null;
 *     amountsRedacted?: boolean;
 *   } | null;
 * }} props
 */
export function HrPayslipPrintModal({ isOpen, onClose, payslip }) {
  const [pdfBusy, setPdfBusy] = useState(false);

  if (!payslip) return null;

  const periodLabel = formatPeriodYyyymm(payslip.periodYyyymm);
  const name = payslip.displayName || payslip.userId || 'Employee';
  const title = `Payslip — ${name} · ${periodLabel}`;
  const redacted = Boolean(payslip.amountsRedacted);

  const row = (label, value) => (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4 text-slate-600">{label}</td>
      <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{value}</td>
    </tr>
  );

  const onPdf = async () => {
    if (!payslip.runId || !payslip.userId) return;
    setPdfBusy(true);
    await downloadSinglePayslipPdf(payslip.runId, payslip.userId);
    setPdfBusy(false);
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={title} showCloseButton={false}>
      <div className="z-modal-panel-lg flex max-h-[92dvh] min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
        <div className="no-print flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="truncate text-sm font-bold text-zarewa-teal">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!redacted && payslip.userId ? (
              <button type="button" onClick={onPdf} disabled={pdfBusy} className="z-btn-secondary gap-2 py-2.5 px-3">
                <Download size={16} aria-hidden />
                {pdfBusy ? '…' : 'PDF'}
              </button>
            ) : null}
            <button type="button" onClick={() => window.print()} className="z-btn-primary gap-2 py-2.5 px-4">
              <Printer size={16} aria-hidden />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary py-2.5 px-3" aria-label="Close">
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-100/80 p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
          <div className="report-print-root quotation-print-preview-mode mx-auto max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl print:shadow-none print:rounded-none print:border-0">
            <StandardReportPrintShell
              documentTypeLabel="HR — Payslip"
              title="Payslip"
              subtitle={name}
              rightColumn={
                <div className="space-y-1">
                  <p>
                    <span className="font-bold text-slate-500">Period</span>
                    <br />
                    {periodLabel}
                  </p>
                  <p>
                    <span className="font-bold text-slate-500">Run status</span>
                    <br />
                    {payslip.runStatus || '—'}
                  </p>
                </div>
              }
              footer="Confidential — for the employee named above. Generated from Zarewa HR payroll."
            >
              {redacted ? (
                <p className="text-sm text-slate-600">Unlock sensitive HR access to view and print amounts.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {row('Gross pay', formatNgn(payslip.grossNgn))}
                    {row('Bonus', formatNgn(payslip.bonusNgn))}
                    {row('Attendance deduction', formatNgn(payslip.attendanceDeductionNgn))}
                    {(payslip.incidentRecoveries || []).map((rc) =>
                      row(
                        `Incident recovery (${rc.caseNumber || rc.scheduleId || 'case'})`,
                        formatNgn(rc.amountNgn)
                      )
                    )}
                    {!(payslip.incidentRecoveries || []).length && payslip.incidentRecoveryNgn
                      ? row('Incident recovery', formatNgn(payslip.incidentRecoveryNgn))
                      : null}
                    {row('Other deduction', formatNgn(payslip.otherDeductionNgn))}
                    {row('PAYE tax', formatNgn(payslip.taxNgn))}
                    {row('Pension', formatNgn(payslip.pensionNgn))}
                    {row('Net pay', formatNgn(payslip.netNgn))}
                  </tbody>
                </table>
              )}
            </StandardReportPrintShell>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
