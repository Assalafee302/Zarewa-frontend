import React from 'react';

/**
 * @param {{ title: string; subtitle?: string; badges?: React.ReactNode; actions?: React.ReactNode }} props
 */
export function FinancePageHeader({ title, subtitle, badges, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black tracking-tight text-zarewa-teal sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{subtitle}</p>
        ) : null}
        {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
