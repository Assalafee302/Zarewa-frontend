import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';

const EMPTY_STATES = {
  needs_action: {
    title: "You're all caught up",
    description: 'No items require your action right now.',
    icon: CheckCircle2,
  },
  all: {
    title: 'Work tray is empty',
    description: 'No work items are visible in your current branch scope.',
    icon: Clock,
  },
  file: {
    title: 'No filed records',
    description: 'Completed and archived records will appear here when available.',
    icon: CheckCircle2,
  },
  unfiled: {
    title: 'All clear',
    description: 'No records need filing right now.',
    icon: CheckCircle2,
  },
  monitoring: {
    title: 'No monitoring alerts',
    description: 'No monitoring alerts for this branch.',
    icon: Clock,
  },
  memos: {
    title: 'No internal memos yet',
    description: 'Compose a memo to start an official workspace thread.',
    icon: AlertCircle,
  },
  category: {
    title: 'No items in this category',
    description: 'Try another category or adjust your filters.',
    icon: Clock,
  },
  search: {
    title: 'No results found',
    description: 'Try a reference number, customer name, memo subject, or status.',
    icon: Search,
  },
  default: {
    title: 'Nothing here',
    description: 'Try another folder or category.',
    icon: Clock,
  },
};

export function WorkspaceInboxEmptyState({
  view = 'all',
  category = 'all',
  categoryEmptyMessage = '',
  onCompose,
  canCompose = false,
  variant = '',
}) {
  const key =
    variant === 'search'
      ? 'search'
      : view === 'memos'
        ? 'memos'
        : category !== 'all'
          ? 'category'
          : view;
  const preset = EMPTY_STATES[key] || EMPTY_STATES.default;
  const Icon = preset.icon;
  const description =
    category !== 'all' && categoryEmptyMessage ? categoryEmptyMessage : preset.description;

  return (
    <div
      className="flex h-full min-h-[220px] flex-col items-center justify-center bg-gradient-to-b from-slate-50/90 to-white px-6"
      role="status"
    >
      <div className="max-w-sm rounded-xl border border-slate-200/90 bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-800">{preset.title}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
        {canCompose && view === 'memos' && onCompose ? (
          <button
            type="button"
            onClick={onCompose}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
          >
            Compose Memo
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function WorkspaceInboxSkeleton({ rows = 6 }) {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="animate-pulse px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-12 rounded bg-slate-100" />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-16 rounded-md bg-slate-100" />
            <div className="h-5 w-20 rounded-md bg-slate-100" />
          </div>
          <div className="mt-2 h-3 w-full rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}
