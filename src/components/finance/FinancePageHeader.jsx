import React from 'react';

/**
 * Compact finance section header (nested panels). Matches PageHeader density.
 */
export function FinancePageHeader({ title, subtitle, badges, actions }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="z-page-title text-zarewa-teal">{title}</h1>
        {subtitle ? <p className="z-page-subtitle">{subtitle}</p> : null}
        {badges ? <div className="mt-2 flex flex-wrap gap-2">{badges}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : null}
    </div>
  );
}
