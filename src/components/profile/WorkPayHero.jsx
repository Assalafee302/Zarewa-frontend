import React from 'react';

/**
 * Shared hero for Leave / Loans / Payslips / Attendance self-service pages.
 */
export function WorkPayHero({ eyebrow, title, description, action, badge }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#134e4a] via-[#0f5c55] to-[#134e4a] p-5 text-white shadow-lg shadow-teal-950/10 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-100/90">{eyebrow}</p>
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
