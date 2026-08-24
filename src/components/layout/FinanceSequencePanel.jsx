import React from 'react';

/** Main content card for Finance pilot — flat white surface, Sequence shadow (see index.css theme). */
export function FinanceSequencePanel({ children, className = '' }) {
  return (
    <div
      className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-zarewa border border-[var(--z-border)] bg-white p-4 shadow-[var(--shadow-zarewa-card)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
