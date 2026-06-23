import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useWorkspaceSearch } from '../../lib/useWorkspaceSearch';
import { loadRecentWorkspaceSearches, pushRecentWorkspaceSearch } from '../../lib/workspaceSearchRecent';
import { flattenSearchHits, WorkspaceSearchResults } from './WorkspaceSearchResults';

export function WorkspaceCommandPalette({ isOpen, onClose, ws, hasPermission, initialQuery = '' }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const canAccessModule = useCallback((m) => ws?.canAccessModule?.(m), [ws?.canAccessModule]);
  const { hits, busy, fromCache } = useWorkspaceSearch({
    query,
    apiOnline: ws?.apiOnline,
    snapshot: ws?.snapshot,
    hasPermission,
    canAccessModule,
    roleKey: ws?.session?.user?.roleKey,
    limit: 20,
  });

  const recent = useMemo(() => (isOpen ? loadRecentWorkspaceSearches() : []), [isOpen]);
  const flatHits = useMemo(() => flattenSearchHits(hits), [hits]);
  const list = flatHits.length > 0 ? flatHits : query.trim().length < 2 ? recent : [];

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, flatHits.length]);

  const openHit = useCallback(
    (hit) => {
      if (!hit) return;
      if (hit.path) {
        pushRecentWorkspaceSearch({ label: hit.label, path: hit.path, state: hit.state });
      }
      onClose?.();
      if (hit.path) navigate(hit.path, hit.state ? { state: hit.state } : undefined);
    },
    [navigate, onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, list.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && list[activeIdx]) {
        e.preventDefault();
        openHit(list[activeIdx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, list, activeIdx, openHit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace, pages, references…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            aria-label="Command palette search"
            autoComplete="off"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
            Esc
          </kbd>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div
          className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain"
          style={{ minHeight: list.length || busy ? undefined : 80 }}
        >
          <WorkspaceSearchResults
            hits={flatHits}
            query={query}
            activeIndex={activeIdx}
            onSelect={openHit}
            onActiveIndexChange={setActiveIdx}
            busy={busy}
            fromCache={fromCache}
            variant="modal"
            recentItems={recent}
            showRecentWhenEmpty
            emptyMessage="Type to search or pick a recent item."
          />
        </div>
      </div>
    </div>
  );
}

export function VirtualizedInboxList({
  items,
  rowHeight = 52,
  maxVisible = 12,
  renderRow,
  emptyState,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * rowHeight;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endIdx = Math.min(items.length, startIdx + maxVisible + 2);
  const slice = items.slice(startIdx, endIdx);
  const offsetY = startIdx * rowHeight;

  if (!items.length) return emptyState || null;

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      style={{ maxHeight: rowHeight * maxVisible }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <ul style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => renderRow(item, startIdx + i))}
        </ul>
      </div>
    </div>
  );
}
