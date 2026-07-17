import React, { useState, useRef, useEffect } from 'react';
import { FilePlus, LifeBuoy, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { BranchWorkspaceBar } from '../../layout/BranchWorkspaceBar';
import { HELP_BOT_NAME } from '../../../lib/helpBotBrand';

const CREATE_OPTIONS = [
  { id: 'memo', label: 'Memo', profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'expense', label: 'Expense request', profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'material', label: 'Material request', profiles: ['staff', 'branch', 'office'] },
  { id: 'notice', label: 'Official notice', profiles: ['office', 'executive'] },
];

/** Shared with MessageComposer Convert menu. */
export const WORKSPACE_CREATE_PROFILES = CREATE_OPTIONS;

export default function WorkspaceCommandBar({
  title,
  onRefresh,
  refreshing,
  onOpenSearch,
  onAskZare,
  onCreate,
  blocksCreate,
  createBlockedMessage,
  usingCachedData,
  realtimeStatus,
  deskProfile = 'staff',
  createMenuOpen: createMenuOpenProp,
  onCreateMenuOpenChange,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = typeof createMenuOpenProp === 'boolean';
  const createOpen = controlled ? createMenuOpenProp : uncontrolledOpen;
  const menuRef = useRef(null);
  const createOptions = CREATE_OPTIONS.filter((opt) => opt.profiles.includes(deskProfile));

  const setMenuOpen = (next) => {
    const value = typeof next === 'function' ? next(createOpen) : next;
    if (!controlled) setUncontrolledOpen(Boolean(value));
    onCreateMenuOpenChange?.(Boolean(value));
  };

  useEffect(() => {
    if (!createOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zarewa Online Office</p>
          <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              disabled={blocksCreate}
              title={blocksCreate ? createBlockedMessage : 'Create office record'}
              aria-label={blocksCreate ? createBlockedMessage : 'Create office record'}
              aria-haspopup="menu"
              aria-expanded={createOpen}
              onClick={() => {
                if (blocksCreate) return;
                setMenuOpen((o) => !o);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900${
                blocksCreate ? ' cursor-not-allowed opacity-50' : ''
              }`}
            >
              <FilePlus size={16} aria-hidden />
              Create
              <ChevronDown size={14} aria-hidden />
            </button>
            {createOpen ? (
              <ul
                role="menu"
                className="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {createOptions.map((opt) => (
                  <li key={opt.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-teal-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onCreate?.(opt.id);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onAskZare}
            aria-label={`Ask ${HELP_BOT_NAME} for workspace help`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50"
          >
            <LifeBuoy size={14} aria-hidden />
            Ask {HELP_BOT_NAME}
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void onRefresh?.()}
            aria-label={refreshing ? 'Refreshing workspace' : 'Refresh workspace'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Open command search"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700"
          >
            <Search size={14} aria-hidden />
            Search
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <BranchWorkspaceBar />
        {realtimeStatus ? (
          <span
            role="status"
            aria-label={
              realtimeStatus === 'connected'
                ? 'Realtime updates connected'
                : 'Realtime unavailable, using polling'
            }
            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
            title={
              realtimeStatus === 'connected'
                ? 'Live updates via EventSource (credentials included)'
                : 'Polling fallback while realtime is unavailable'
            }
          >
            {realtimeStatus === 'connected' ? 'Live' : 'Polling'}
          </span>
        ) : null}
      </div>
      {usingCachedData ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Read-only snapshot — reconnect for live actions.
        </p>
      ) : null}
    </header>
  );
}
