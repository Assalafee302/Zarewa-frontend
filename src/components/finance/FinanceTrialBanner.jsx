import React from 'react';
import { Info } from 'lucide-react';

export function FinanceTrialBanner({ children }) {
  return (
    <div className="mb-6 flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm font-medium text-sky-950">
      <Info size={18} className="mt-0.5 shrink-0 text-sky-700" aria-hidden />
      <div className="leading-relaxed">
        <span className="font-bold">Trial mode</span>
        {children ? <> — {children}</> : null}
        <span className="block text-xs text-sky-800/90 mt-1">
          Counts are for review and training. Strict blocks stay off until leadership enables them.
        </span>
      </div>
    </div>
  );
}
