import React, { useMemo, useState } from 'react';
import {
  OfficialNoticesPanel,
  DeskSearchPanel,
} from '../OfficeDeskPanels';

function RecordList({ items, empty, onOpenItem }) {
  if (!items.length) return <p className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpenItem?.(item)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-teal-200"
          >
            <span className="block text-sm font-semibold text-slate-900">{item.title || item.referenceNo || 'Untitled record'}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {item.filingNo || item.filingReference || item.data?.filingNo || item.referenceNo || item.status || 'Record'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Records zone — formal memos path via Action/Create; notices, filing, search here.
 */
export default function RecordsZone({
  subView,
  onSubViewChange,
  items,
  onOpenItem,
  onCreateNotice,
}) {
  const [query, setQuery] = useState('');
  const [noticeVersion, setNoticeVersion] = useState(0);
  const tabs = [
    { id: 'notices', label: 'Official notices' },
    { id: 'filing', label: 'Filing' },
    { id: 'search', label: 'Search' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'filed', label: 'Filed' },
  ];
  const active = subView || 'notices';
  const records = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const needsFiling = records.filter((item) => item.filingIncomplete);
  const filed = records.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    return !item.filingIncomplete && Boolean(item.filingNo || item.filingReference || item.data?.filingNo || status === 'filed');
  });
  const drafts = records.filter((item) => /draft/.test(String(item.status || '').toLowerCase()));
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return records.filter((item) =>
      `${item.title || ''} ${item.filingNo || ''} ${item.filingReference || ''} ${item.referenceNo || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [records, query]);

  return (
    <div className="space-y-3">
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1"
        role="tablist"
        aria-label="Records views"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`records-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`records-panel-${tab.id}`}
            onClick={() => onSubViewChange?.(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              active === tab.id ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`records-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`records-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {active === tab.id && tab.id === 'notices' ? (
            <div className="space-y-3">
              {onCreateNotice ? (
                <button
                  type="button"
                  onClick={async () => {
                    const created = await onCreateNotice();
                    if (created !== false) setNoticeVersion((value) => value + 1);
                  }}
                  className="rounded-lg bg-teal-800 px-3 py-2 text-xs font-semibold text-white"
                >
                  Create official notice
                </button>
              ) : null}
              <OfficialNoticesPanel key={noticeVersion} />
            </div>
          ) : null}
          {active === tab.id && tab.id === 'filing' ? (
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">Needs filing ({needsFiling.length})</h3>
                <RecordList items={needsFiling} empty="No records need filing." onOpenItem={onOpenItem} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">Recently filed ({filed.length})</h3>
                <RecordList items={filed} empty="No filed records in this view." onOpenItem={onOpenItem} />
              </section>
            </div>
          ) : null}
          {active === tab.id && tab.id === 'search' ? (
            <div className="space-y-3">
              <DeskSearchPanel />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter loaded records by title or filing number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              {query ? <RecordList items={localMatches} empty="No loaded records match." onOpenItem={onOpenItem} /> : null}
            </div>
          ) : null}
          {active === tab.id && tab.id === 'drafts' ? <RecordList items={drafts} empty="No draft records." onOpenItem={onOpenItem} /> : null}
          {active === tab.id && tab.id === 'filed' ? <RecordList items={filed} empty="No filed records." onOpenItem={onOpenItem} /> : null}
        </div>
      ))}
    </div>
  );
}
