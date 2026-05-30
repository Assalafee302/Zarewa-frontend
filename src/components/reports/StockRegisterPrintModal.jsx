import React from 'react';
import { Printer, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { StandardReportPrintShell } from './StandardReportPrintShell';
import { StockRegisterPrintContent } from './StockRegisterPrintContent';

export function StockRegisterPrintModal({ open, onClose, register, branchId, branchLabel, workflow }) {
  if (!register) return null;

  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const status = workflow?.status ? String(workflow.status).replace(/_/g, ' ').toUpperCase() : 'DRAFT';

  return (
    <ModalFrame isOpen={Boolean(open)} onClose={onClose} showCloseButton={false}>
      <div className="z-modal-panel-lg max-h-[92vh] flex flex-col p-0 overflow-hidden w-full max-w-5xl">
        <div className="no-print flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0 bg-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="text-sm font-bold text-[#134e4a] truncate">
              Stock register · {branchLabel || branchId} · {register.periodEnd}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => window.print()} className="z-btn-primary py-2.5 px-4">
              <Printer size={16} />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary py-2.5 px-3" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-100/80 p-4 sm:p-6 print-portal-scroll">
          <div className="report-print-root quotation-print-preview-mode mx-auto rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden print:shadow-none print:rounded-none print:border-0">
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
        </div>
      </div>
    </ModalFrame>
  );
}
