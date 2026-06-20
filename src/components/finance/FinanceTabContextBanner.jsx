import React from 'react';

/**
 * Short role-aware context at the top of Finance tabs.
 * @param {{ tone?: 'teal' | 'slate' | 'amber' | 'sky'; title: string; body: React.ReactNode; action?: React.ReactNode; testId?: string }} props
 */
export function FinanceTabContextBanner({ tone = 'teal', title, body, action, testId }) {
  const toneCls = {
    teal: 'border-teal-200/90 bg-teal-50/60 text-teal-950',
    slate: 'border-slate-200/90 bg-slate-50/80 text-slate-800',
    amber: 'border-amber-200/90 bg-amber-50/65 text-amber-950',
    sky: 'border-sky-200/90 bg-sky-50/60 text-sky-950',
  };
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 ${toneCls[tone] || toneCls.teal}`}
      data-testid={testId}
    >
      <div className="min-w-0 max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-wide">{title}</p>
        <p className="text-[10px] leading-relaxed mt-0.5 opacity-95">{body}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
