import React from 'react';

export function FinanceEmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
