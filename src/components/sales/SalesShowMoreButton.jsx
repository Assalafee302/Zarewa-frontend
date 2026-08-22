import React from 'react';

/** Shared “Show more” control for sales record lists. */
export function SalesShowMoreButton({ label, onClick }) {
  return (
    <div className="flex justify-center mt-6">
      <button
        type="button"
        onClick={onClick}
        className="px-6 py-2 rounded-lg border border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
      >
        {label}
      </button>
    </div>
  );
}
