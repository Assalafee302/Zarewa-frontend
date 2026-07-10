import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { StandardReportPrintShell } from '../reports/StandardReportPrintShell';
import { downloadEmploymentLetterPdf } from '../../lib/hrExtended';

const KIND_LABEL = {
  employment: 'Employment confirmation',
  experience: 'Experience letter',
};

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   letter: { id: string; contentText?: string; letterKind?: string; issuedAtIso?: string; userId?: string } | null;
 *   staffDisplayName?: string;
 * }} props
 */
export function HrLetterPrintModal({ isOpen, onClose, letter, staffDisplayName }) {
  const [pdfBusy, setPdfBusy] = useState(false);

  if (!letter) return null;

  const kindLabel = KIND_LABEL[letter.letterKind] || letter.letterKind || 'HR letter';
  const issued = letter.issuedAtIso?.slice(0, 10) || '—';
  const title = `${kindLabel}${staffDisplayName ? ` — ${staffDisplayName}` : ''}`;

  const onPdf = async () => {
    setPdfBusy(true);
    await downloadEmploymentLetterPdf(letter.id);
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
            <button type="button" onClick={onPdf} disabled={pdfBusy} className="z-btn-secondary gap-2 py-2.5 px-3">
              <Download size={16} aria-hidden />
              {pdfBusy ? '…' : 'PDF'}
            </button>
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
              documentTypeLabel="HR — Employment letter"
              title={kindLabel}
              subtitle={staffDisplayName || undefined}
              rightColumn={
                <div className="space-y-1">
                  <p>
                    <span className="font-bold text-slate-500">Issued</span>
                    <br />
                    {issued}
                  </p>
                  <p>
                    <span className="font-bold text-slate-500">Reference</span>
                    <br />
                    {letter.id}
                  </p>
                </div>
              }
              footer="This document was generated from Zarewa HR. Official letters should be signed and stamped by HQ HR before external use."
            >
              <div className="whitespace-pre-wrap text-[12pt] leading-relaxed text-slate-900 print:text-[11pt]">
                {letter.contentText || '(No letter body.)'}
              </div>
            </StandardReportPrintShell>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
