import React from 'react';

/** Shared empty state for desk tables and split panes. */
export function DeskEmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-zarewa-teal">
          <Icon size={24} />
        </div>
      ) : null}
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-xl bg-zarewa-teal px-4 py-2.5 text-sm font-bold text-white hover:brightness-105"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DeskLoadingSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-slate-100" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
