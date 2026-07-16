import React from 'react';
import {
  OfficialNoticesPanel,
  FilingPanel,
  DeskSearchPanel,
} from '../OfficeDeskPanels';

/**
 * Records zone — formal memos path via Action/Create; notices, filing, search here.
 */
export default function RecordsZone({
  subView,
  onSubViewChange,
  items,
  inboxCtx,
}) {
  const tabs = [
    { id: 'notices', label: 'Official notices' },
    { id: 'filing', label: 'Filing' },
    { id: 'search', label: 'Search' },
  ];
  const active = subView || 'notices';
  const panelId = `records-panel-${active}`;

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
            aria-controls={panelId}
            onClick={() => onSubViewChange?.(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              active === tab.id ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={`records-tab-${active}`}>
        {active === 'notices' ? <OfficialNoticesPanel /> : null}
        {active === 'filing' ? <FilingPanel items={items} inboxCtx={inboxCtx} /> : null}
        {active === 'search' ? <DeskSearchPanel /> : null}
      </div>
    </div>
  );
}
