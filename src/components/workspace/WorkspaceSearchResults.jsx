import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  groupWorkspaceSearchHits,
  splitSearchHighlight,
  workspaceSearchKindLabel,
} from '../../shared/lib/workspaceSearchCore.js';

function HighlightText({ text, query, className = '' }) {
  const parts = splitSearchHighlight(text, query);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded bg-teal-100 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

/**
 * Grouped workspace search results with keyboard selection support.
 */
export function WorkspaceSearchResults({
  hits = [],
  query = '',
  activeIndex = 0,
  onSelect,
  onActiveIndexChange,
  busy = false,
  fromCache = false,
  emptyMessage = 'No matches — Enter uses quick paths (QT-, PO-, CL-, PJ-, …).',
  variant = 'dropdown',
  recentItems = [],
  showRecentWhenEmpty = false,
  className = '',
}) {
  const groups = useMemo(() => groupWorkspaceSearchHits(hits), [hits]);
  const flatHits = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const list = flatHits.length > 0 ? flatHits : showRecentWhenEmpty && query.trim().length < 2 ? recentItems : [];

  const isModal = variant === 'modal';
  const rowPad = isModal ? 'px-4 py-3' : 'px-3 py-3 sm:py-2';
  const textSize = isModal ? 'text-sm' : 'text-[12px]';
  const subSize = isModal ? 'text-xs' : 'text-ui-xs';

  if (busy) {
    return (
      <div className={className} role="status">
        <p className={`${rowPad} ${isModal ? 'text-center text-slate-500' : 'text-xs text-gray-500'}`}>
          Searching…
        </p>
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className={className}>
        <div className="divide-y divide-amber-50">
          <p className={`${rowPad} ${isModal ? 'text-center text-slate-500' : 'text-xs text-gray-500'}`}>
            {query.trim().length >= 2 ? 'No results.' : emptyMessage}
          </p>
          {fromCache ? (
            <p
              className={`${rowPad} text-ui-xs font-medium text-amber-950 bg-amber-50/90`}
              role="status"
            >
              Cached workspace — empty results may be false negatives. Reconnect for live search.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  let rowCounter = 0;

  return (
    <div className={className}>
      <div className={isModal ? '' : 'divide-y divide-gray-100'} role="listbox" aria-label="Search results">
        {groups.length > 0
          ? groups.map((group) => (
              <div key={group.kind}>
                <p
                  className={`sticky top-0 z-[1] border-b border-gray-100 bg-gray-50/95 px-3 py-1.5 text-ui-xs font-black uppercase tracking-widest text-gray-400 ${
                    isModal ? 'px-4' : ''
                  }`}
                >
                  {group.label}
                </p>
                <ul>
                  {group.items.map((hit) => {
                    const idx = rowCounter++;
                    const active = idx === activeIndex;
                    return (
                      <li key={`${hit.kind}-${hit.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`flex w-full items-center gap-2 text-left hover:bg-teal-50/80 ${rowPad} ${
                            active ? 'bg-teal-50/80' : ''
                          }`}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onMouseEnter={() => onActiveIndexChange?.(idx)}
                          onClick={() => onSelect?.(hit)}
                        >
                          <span className={`min-w-0 flex-1 ${textSize}`}>
                            <span className={`block truncate font-semibold text-zarewa-teal ${isModal ? 'font-medium text-slate-900' : ''}`}>
                              <HighlightText text={hit.label} query={query} />
                            </span>
                            {hit.sublabel ? (
                              <span className={`block truncate text-gray-500 ${subSize}`}>
                                <HighlightText text={hit.sublabel} query={query} />
                              </span>
                            ) : (
                              <span className={`block truncate text-gray-500 ${subSize}`}>
                                {workspaceSearchKindLabel(hit.kind)}
                              </span>
                            )}
                          </span>
                          {isModal ? <ArrowRight size={14} className="shrink-0 text-slate-400" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          : list.map((hit, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={`${hit.kind || 'item'}-${hit.id || hit.label}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center gap-3 text-left hover:bg-teal-50 ${rowPad} ${
                    active ? 'bg-teal-50/80' : ''
                  }`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => onActiveIndexChange?.(idx)}
                  onClick={() => onSelect?.(hit)}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-medium ${isModal ? 'text-slate-900' : 'text-zarewa-teal'}`}>
                      {hit.label}
                    </span>
                    {hit.sublabel ? (
                      <span className={`block truncate text-gray-500 ${subSize}`}>{hit.sublabel}</span>
                    ) : null}
                  </span>
                  {isModal ? <ArrowRight size={14} className="shrink-0 text-slate-400" /> : null}
                </button>
              );
            })}
      </div>
      {fromCache ? (
        <p
          className={`border-t border-amber-100 bg-amber-50/90 ${rowPad} text-ui-xs font-medium text-amber-950`}
          role="status"
        >
          Cached workspace — results may be incomplete or outdated. Reconnect for live search.
        </p>
      ) : null}
    </div>
  );
}

/** Flatten grouped hits for keyboard navigation index lookups. */
export function flattenSearchHits(hits) {
  return groupWorkspaceSearchHits(hits).flatMap((g) => g.items);
}
