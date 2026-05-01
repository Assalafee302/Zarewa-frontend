import React from 'react';

/** Main content card for Finance pilot — flat white surface, Sequence shadow (see index.css theme). */
export function FinanceSequencePanel({ children, className = '' }) {
  return (
    <div
      className={`relative min-h-[min(480px,55vh)] w-full min-w-0 max-w-full overflow-hidden rounded-zarewa border border-slate-200/75 bg-white p-6 shadow-[var(--shadow-sequence)] sm:min-h-[520px] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
