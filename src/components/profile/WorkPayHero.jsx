import React from 'react';

/**
 * Shared hero for Leave / Loans / Payslips / Attendance self-service pages.
 * Use variant="context" when the page shell already shows the section title.
 */
export function WorkPayHero({ variant = 'full', eyebrow, title, description, action, badge }) {
  if (variant === 'context') {
    if (!description && !action) return null;
    return (
      <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {description ? (
            <p className="min-w-0 text-sm leading-relaxed text-slate-700">{description}</p>
          ) : (
            <span />
          )}
          {action ? <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">{action}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zarewa-teal via-[#0f5c55] to-zarewa-teal p-5 text-white shadow-lg shadow-teal-950/10 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-teal-100/90">{eyebrow}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/90">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
