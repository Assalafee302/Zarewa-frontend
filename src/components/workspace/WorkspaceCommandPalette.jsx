import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { searchWorkspaceSnapshot } from '../../lib/workspaceSearchLocal';
import { loadRecentWorkspaceSearches, pushRecentWorkspaceSearch } from '../../lib/workspaceSearchRecent';

export function WorkspaceCommandPalette({ isOpen, onClose, ws, hasPermission }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const recent = useMemo(() => (isOpen ? loadRecentWorkspaceSearches() : []), [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHits([]);
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setBusy(false);
      return undefined;
    }
    const t = window.setTimeout(async () => {
      setBusy(true);
      if (ws?.apiOnline) {
        const { ok, data } = await apiFetch(`/api/workspace/search?q=${encodeURIComponent(q)}&limit=16`);
        setBusy(false);
        if (ok && data?.ok && Array.isArray(data.results)) {
          setHits(data.results);
          setActiveIdx(0);
          return;
        }
      }
      setBusy(false);
      setHits(searchWorkspaceSnapshot(ws?.snapshot, q, hasPermission, 16));
      setActiveIdx(0);
    }, 220);
    return () => window.clearTimeout(t);
  }, [query, ws, hasPermission]);

  const openHit = useCallback(
    (hit) => {
      if (!hit) return;
      pushRecentWorkspaceSearch({ label: hit.label, path: hit.path, state: hit.state });
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
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && hits[activeIdx]) {
        e.preventDefault();
        openHit(hits[activeIdx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, hits, activeIdx, openHit, onClose]);

  if (!isOpen) return null;

  const list = hits.length > 0 ? hits : query.trim().length < 2 ? recent : [];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace, memos, references…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
            Esc
          </kbd>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto" style={{ minHeight: list.length ? undefined : 80 }}>
          {busy ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Searching…</p>
          ) : list.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {query.trim().length >= 2 ? 'No results.' : 'Type to search or pick a recent item.'}
            </p>
          ) : (
            <ul>
              {list.slice(0, 20).map((hit, idx) => (
                <li key={`${hit.kind || 'item'}-${hit.id || hit.label}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => openHit(hit)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-teal-50 ${
                      idx === activeIdx ? 'bg-teal-50/80' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{hit.label}</span>
                      {hit.sublabel ? (
                        <span className="block truncate text-xs text-slate-500">{hit.sublabel}</span>
                      ) : null}
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
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
