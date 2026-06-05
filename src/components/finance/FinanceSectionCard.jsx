import React from 'react';

/**
 * @param {{ title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }} props
 */
export function FinanceSectionCard({ title, icon, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
