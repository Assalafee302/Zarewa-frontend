import React from 'react';
import { useOfficeRecordActions } from '../../lib/useOfficeRecordActions';
import OfficeRecordActionBar from '../workspace/OfficeRecordActionBar';

/**
 * Endorse / return / close for office memos opened from Command Centre.
 */
export function ExecOfficeMemoDecisionBar({ threadId, workItemId, onCompleted }) {
  const actions = useOfficeRecordActions({
    workItem: workItemId ? { id: workItemId } : null,
    threadId,
    onRefresh: onCompleted,
  });

  if (!threadId) return null;

  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
      <OfficeRecordActionBar actions={actions} />
    </div>
  );
}
