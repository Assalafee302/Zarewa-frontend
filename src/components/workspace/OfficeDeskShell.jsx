import React, { useMemo, useState } from 'react';
import TaskQueuePanel from './TaskQueuePanel';
import OfficeRecordDetail from './OfficeRecordDetail';
import {
  OfficialNoticesPanel,
  OfficeForumPanel,
  FilingPanel,
  ExpenseConversionsPanel,
  DeskMonitoringPanel,
  DeskSearchPanel,
} from './OfficeDeskPanels';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../../lib/workItemPersonalInbox';
import { workItemIsFiledTrayItem } from '../../lib/workspaceInboxBuckets';

/**
 * Single office desk: nav section content + task queue + record detail.
 */
export default function OfficeDeskShell({
  sectionId,
  items,
  inboxCtx,
  taskTab,
  onTaskTabChange,
  selectedItem,
  onSelectItem,
  onClearSelection,
  onRefresh,
}) {
  const visible = useMemo(
    () => items.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx)),
    [items, inboxCtx]
  );

  const records = useMemo(() => visible.filter((i) => !workItemIsFiledTrayItem(i) || sectionId === 'filing'), [visible, sectionId]);

  if (sectionId === 'notices') return <OfficialNoticesPanel />;
  if (sectionId === 'forum' || sectionId === 'branch_forum') {
    return <OfficeForumPanel scope={sectionId === 'forum' ? 'company' : 'branch'} />;
  }
  if (sectionId === 'filing') return <FilingPanel items={visible} inboxCtx={inboxCtx} />;
  if (sectionId === 'expense_conversions') {
    return <ExpenseConversionsPanel items={visible} onOpenItem={onSelectItem} />;
  }
  if (sectionId === 'monitoring' || sectionId === 'branch_monitoring') return <DeskMonitoringPanel />;
  if (sectionId === 'search') return <DeskSearchPanel />;

  const showTasks =
    sectionId === 'tasks' ||
    sectionId === 'desk' ||
    sectionId === 'today' ||
    sectionId === 'endorsements' ||
    sectionId === 'approvals' ||
    sectionId === 'review' ||
    sectionId === 'my_requests' ||
    sectionId === 'team_requests' ||
    sectionId === 'high_value' ||
    sectionId === 'overdue' ||
    sectionId === 'records';

  if (selectedItem) {
    return (
      <OfficeRecordDetail
        workItem={selectedItem}
        onClose={onClearSelection}
        onRefresh={onRefresh}
      />
    );
  }

  if (showTasks) {
    const tab = taskTab || 'needs_action';
    return (
      <TaskQueuePanel
        items={visible}
        inboxCtx={inboxCtx}
        activeTab={tab}
        onTabChange={onTaskTabChange}
        onSelectItem={onSelectItem}
      />
    );
  }

  return (
    <TaskQueuePanel
      items={records}
      inboxCtx={inboxCtx}
      activeTab={taskTab || 'needs_action'}
      onTabChange={onTaskTabChange}
      onSelectItem={onSelectItem}
      emptyMessage="Select a section from the desk menu."
    />
  );
}
