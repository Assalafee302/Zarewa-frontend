import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ExecutiveReportPacksSection } from './ExecutiveReportPacksSection.jsx';
import { OperationalReportsPanel } from './OperationalReportsPanel.jsx';
import { PaymentExceptionQueuePanel } from './PaymentExceptionQueuePanel.jsx';

export function ReportsOversightPanel({
  showToast,
  paymentExceptionQueue,
  openExceptionCount,
  closureNotes,
  onToggleClosed,
  onUpdateNote,
}) {
  const [open, setOpen] = useState(false);

  const chips = [
    'Executive daily & weekly',
    'Operational control centre',
    openExceptionCount > 0 ? `${openExceptionCount} open exception(s)` : 'Payment exceptions',
  ];

  return (
    <section className="z-panel-section border border-slate-200/90 bg-white/90 p-5 sm:p-6 rounded-2xl shadow-sm mt-4">
      <button
        type="button"
        className="w-full text-left flex flex-wrap items-start justify-between gap-3 group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h3 className="z-section-title !mb-1">Oversight &amp; control</h3>
          <p className="text-sm font-medium text-slate-600 max-w-3xl leading-relaxed">
            Leadership summaries, operational governance exports, and payment exception triage for the selected period.
          </p>
          {!open ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {chips.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    label.includes('open exception')
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 uppercase tracking-wide shrink-0">
          {open ? 'Collapse' : 'Expand'}
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      {open ? (
        <div className="mt-6 space-y-6 pt-6 border-t border-slate-100">
          <ExecutiveReportPacksSection showToast={showToast} />

          <section className="z-soft-panel p-5 sm:p-6">
            <h4 className="text-base font-black text-[#134e4a] tracking-tight mb-1">Operational control centre</h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Pending approvals, production gate overrides, conversion reviews, production outliers, and governance pack
              export.
            </p>
            <OperationalReportsPanel />
          </section>

          <PaymentExceptionQueuePanel
            queue={paymentExceptionQueue}
            openCount={openExceptionCount}
            closureNotes={closureNotes}
            onToggleClosed={onToggleClosed}
            onUpdateNote={onUpdateNote}
          />
        </div>
      ) : null}
    </section>
  );
}
