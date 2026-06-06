import React from 'react';
import { Clock } from 'lucide-react';
import { HrEmptyState } from './hrPageUi';

/**
 * Placeholder for Phase 2 HR features — no fake API calls or broken buttons.
 */
export default function HrPhase2Placeholder({ title, purpose, phase = 2 }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-6">
      <div className="flex items-start gap-3">
        <Clock size={22} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
        <HrEmptyState
          title={title}
          description={
            purpose
              ? `${purpose} This capability is planned for Phase ${phase} and will connect to backend workflows when ready.`
              : `This capability is planned for Phase ${phase}.`
          }
        />
      </div>
    </div>
  );
}
