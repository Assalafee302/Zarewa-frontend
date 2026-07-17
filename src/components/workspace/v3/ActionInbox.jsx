import React, { useMemo } from 'react';
import TaskQueuePanel from '../TaskQueuePanel';
import OfficeRecordDetail from '../OfficeRecordDetail';
import TodayWorkCards from '../TodayWorkCards';
import { workItemMatchesActionChip } from '../../../lib/workspaceZoneConfig';

/**
 * Action zone — split-pane list + detail on desktop.
 * Chips narrow content (what the item is about); tabs narrow state (whose move it is).
 */
export default function ActionInbox({
  items,
  inboxCtx,
  taskTab,
  onTaskTabChange,
  actionChips = [],
  activeChip,
  onChipChange,
  selectedItem,
  onSelectItem,
  onClearSelection,
  onRefresh,
  recordActions = null,
  todayCounts,
  onTodayNavigate,
  onOpenSourceRoom,
}) {
  const chipFiltered = useMemo(
    () => (activeChip ? items.filter((item) => workItemMatchesActionChip(item, activeChip)) : items),
    [items, activeChip]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row" role="region" aria-label="Action inbox">
      <div className={`min-w-0 ${selectedItem ? 'hidden lg:flex lg:w-[40%] lg:flex-col' : 'flex flex-1 flex-col'}`}>
        {todayCounts ? (
          <div className="mb-3">
            <TodayWorkCards counts={todayCounts} onNavigate={onTodayNavigate} />
          </div>
        ) : null}
        {actionChips.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Content filters">
            <button
              type="button"
              aria-pressed={!activeChip}
              onClick={() => onChipChange?.(null)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                !activeChip ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100' : 'bg-slate-50 text-slate-600'
              }`}
            >
              All
            </button>
            {actionChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={activeChip === chip.id}
                onClick={() => onChipChange?.(activeChip === chip.id ? null : chip.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  activeChip === chip.id ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100' : 'bg-slate-50 text-slate-600'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TaskQueuePanel
            items={chipFiltered}
            inboxCtx={inboxCtx}
            activeTab={taskTab || 'needs_action'}
            onTabChange={onTaskTabChange}
            onSelectItem={onSelectItem}
            selectedItemId={selectedItem?.id}
            emptyMessage={activeChip ? 'No items match this filter' : undefined}
          />
        </div>
      </div>
      {selectedItem ? (
        <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white lg:w-[60%]">
          {selectedItem.originRoomId || selectedItem.data?.originRoomId ? (
            <div className="border-b border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => onOpenSourceRoom?.(selectedItem.originRoomId || selectedItem.data?.originRoomId)}
                className="text-xs font-semibold text-teal-800 hover:underline"
              >
                Open source chat
              </button>
            </div>
          ) : null}
          <OfficeRecordDetail
            workItem={selectedItem}
            onClose={onClearSelection}
            onRefresh={onRefresh}
            recordActions={recordActions}
          />
        </div>
      ) : (
        <div
          className="hidden min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center lg:flex lg:w-[60%]"
          role="status"
        >
          <p className="text-sm text-slate-500">Select an item to review, approve, or file.</p>
        </div>
      )}
    </div>
  );
}
