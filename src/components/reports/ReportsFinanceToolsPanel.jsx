import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ReportsGlPilotSection } from './ReportsGlPilotSection.jsx';
import { ReportsFinanceReconciliationPackSection } from './ReportsFinanceReconciliationPackSection.jsx';
import { Ap2ReportsSection } from '../finance/Ap2ReportsSection.jsx';
import { Ap3ReportsSection } from '../finance/Ap3ReportsSection.jsx';

export function ReportsFinanceToolsPanel({
  startDate,
  endDate,
  visible,
  hasFinanceView,
  showToast,
  branchScopeLabel,
  mayViewAp2,
  mayViewAp3,
}) {
  const [open, setOpen] = useState(false);

  if (!visible || !hasFinanceView) return null;

  const toolLabels = ['Cash confirmation pack', 'GL pilot', mayViewAp2 ? 'AP2 diagnostics' : null, mayViewAp3 ? 'AP3 costing' : null].filter(
    Boolean
  );

  return (
    <section className="z-panel-section border border-slate-200/90 bg-white/90 p-5 sm:p-6 rounded-2xl shadow-sm">
      <button
        type="button"
        className="w-full text-left flex flex-wrap items-start justify-between gap-3 group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h3 className="z-section-title !mb-1">Finance tools</h3>
          <p className="text-sm font-medium text-slate-600 max-w-3xl leading-relaxed">
            Reconciliation pack, GL pilot, and supplier/costing diagnostics. Full GL workflows also live on{' '}
            <Link
              to="/accounting"
              className="font-bold text-teal-800 underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Accounting Desk
            </Link>
            ; cashiers should use Cashier Desk for receipt confirmation.
          </p>
          {!open ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {toolLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"
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
        <div className="mt-6 space-y-8 pt-6 border-t border-slate-100">
          <ReportsFinanceReconciliationPackSection
            endDate={endDate}
            hasFinanceView={hasFinanceView}
            showToast={showToast}
            branchScopeLabel={branchScopeLabel}
          />
          <ReportsGlPilotSection
            startDate={startDate}
            endDate={endDate}
            hasFinanceView={hasFinanceView}
            showToast={showToast}
          />
          <Ap2ReportsSection mayView={mayViewAp2} />
          <Ap3ReportsSection mayView={mayViewAp3} />
        </div>
      ) : null}
    </section>
  );
}
