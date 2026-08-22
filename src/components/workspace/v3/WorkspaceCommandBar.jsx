import React, { useState, useRef, useEffect } from 'react';
import { FilePlus, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { BranchWorkspaceBar } from '../../layout/BranchWorkspaceBar';

const CREATE_OPTIONS = [
  { id: 'memo', label: 'Memo', profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'expense', label: 'Expense request', profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'material', label: 'Material request', profiles: ['staff', 'branch', 'office'] },
  { id: 'incident', label: 'Operations incident', profiles: ['staff', 'branch', 'office'] },
  { id: 'fuel', label: 'Fuel / diesel record', profiles: ['staff', 'branch', 'office'] },
  { id: 'leave', label: 'Leave request', profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'notice', label: 'Official notice', profiles: ['office', 'executive'] },
];

/** Shared with MessageComposer Convert menu. */
export const WORKSPACE_CREATE_PROFILES = CREATE_OPTIONS;

function realtimeCopy(status) {
  if (status === 'connected') {
    return {
      label: 'Updating live',
      aria: 'Workspace is updating live',
      title: 'New activity appears as it happens',
    };
  }
  return {
    label: 'Refreshing every minute',
    aria: 'Workspace refreshes about once a minute',
    title: 'Checking for updates about once a minute',
  };
}

export default function WorkspaceCommandBar({
  title,
  onRefresh,
  refreshing,
  onOpenSearch,
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
  const createBtnRef = useRef(null);
  const itemRefs = useRef([]);
  const createOptions = CREATE_OPTIONS.filter((opt) => opt.profiles.includes(deskProfile));

  const setMenuOpen = (next) => {
    const value = typeof next === 'function' ? next(createOpen) : next;
    if (!controlled) setUncontrolledOpen(Boolean(value));
    onCreateMenuOpenChange?.(Boolean(value));
  };

  useEffect(() => {
    if (!createOpen) return undefined;
    queueMicrotask(() => itemRefs.current[0]?.focus());
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        createBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  const moveMenuFocus = (fromIndex, key) => {
    const last = createOptions.length - 1;
    if (last < 0) return false;
    let next = fromIndex;
    if (key === 'ArrowDown') next = fromIndex === last ? 0 : fromIndex + 1;
    else if (key === 'ArrowUp') next = fromIndex === 0 ? last : fromIndex - 1;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = last;
    else return false;
    queueMicrotask(() => itemRefs.current[next]?.focus());
    return true;
  };

  const live = realtimeStatus ? realtimeCopy(realtimeStatus) : null;

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
              ref={createBtnRef}
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
              onKeyDown={(e) => {
                if (blocksCreate) return;
                if (e.key === 'ArrowDown' && !createOpen) {
                  e.preventDefault();
                  setMenuOpen(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2${
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
                aria-label="Create office record"
                className="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {createOptions.map((opt, i) => (
                  <li key={opt.id} role="none">
                    <button
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-teal-50 focus-visible:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                      onClick={() => {
                        setMenuOpen(false);
                        onCreate?.(opt.id);
                      }}
                      onKeyDown={(e) => {
                        if (moveMenuFocus(i, e.key)) e.preventDefault();
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
            disabled={refreshing}
            onClick={() => void onRefresh?.()}
            aria-label={refreshing ? 'Refreshing workspace' : 'Refresh workspace'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search (/ or Ctrl+K)"
            aria-label="Open command search, slash or Control K"
            aria-keyshortcuts="/ Control+K"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1"
          >
            <Search size={14} aria-hidden />
            Search
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <BranchWorkspaceBar />
        {live ? (
          <span
            role="status"
            aria-atomic="true"
            aria-label={live.aria}
            title={live.title}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {live.label}
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
