import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { officeRecordStatusBadges } from '../../lib/officeRecordStatus';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { useOfficeRecordActions } from '../../lib/useOfficeRecordActions';
import { OfficeThreadConversationDrawer } from '../office/OfficeThreadConversationDrawer';
import { normalizeWorkItem } from '../../lib/workspaceWorkItemModel';
import OfficeRecordActionBar from './OfficeRecordActionBar';
import OfficeRecordBmEditModal from './OfficeRecordBmEditModal';

function TimelineList({ events }) {
  if (!events?.length) {
    return <p className="text-sm text-slate-500">No timeline events yet.</p>;
  }
  return (
    <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
      {events.map((ev, i) => (
        <li key={ev.id || i} className="relative">
          <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-teal-600" />
          <p className="text-sm font-semibold text-slate-800">{ev.label || ev.action || ev.decisionKey}</p>
          <p className="text-xs text-slate-500">
            {ev.actorDisplayName || ev.actor || 'System'} · {ev.actedAtIso || ev.createdAtIso || ''}
          </p>
          {ev.note ? <p className="mt-1 text-sm text-slate-600">{ev.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Professional office record detail with tabs; delegates conversation to thread drawer inline.
 */
export default function OfficeRecordDetail({ workItem, onClose, onRefresh }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [tab, setTab] = useState('overview');
  const [timeline, setTimeline] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [bmEditOpen, setBmEditOpen] = useState(false);
  const [openConvertExpense, setOpenConvertExpense] = useState(false);
  const threadId = officeThreadIdFromWorkItem(workItem);

  const actions = useOfficeRecordActions({ workItem, threadId, onRefresh });
  const n = normalizeWorkItem(workItem, { userId: ws?.session?.user?.id });
  const badges = officeRecordStatusBadges(workItem);
  const loadTimeline = useCallback(async () => {
    if (!workItem?.id) return;
    setLoadingTimeline(true);
    const { ok, data } = await apiFetch(`/api/work-items/${encodeURIComponent(workItem.id)}/timeline`);
    setLoadingTimeline(false);
    if (ok && data?.ok) setTimeline(data.events || data.timeline || []);
  }, [workItem?.id]);

  const loadVersions = useCallback(async () => {
    if (!threadId) return;
    const { ok, data } = await apiFetch(`/api/office/threads/${encodeURIComponent(threadId)}/versions`);
    if (ok && data?.ok) setVersions(data.versions || []);
  }, [threadId]);

  useEffect(() => {
    if (tab === 'timeline') void loadTimeline();
    if (tab === 'audit') void loadVersions();
  }, [tab, loadTimeline, loadVersions]);

  const fileRecord = async () => {
    if (!threadId) return;
    const { ok, data } = await apiFetch(`/api/office/threads/${encodeURIComponent(threadId)}/file`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not file record.', { variant: 'error' });
      return;
    }
    showToast(`Filed: ${data.filingNo}`, { variant: 'success' });
    onRefresh?.();
  };

  const tabs = [
    ['overview', 'Overview'],
    ['conversation', 'Conversation'],
    ['timeline', 'Timeline'],
    ['files', 'Files'],
    ['linked', 'Linked Records'],
    ['approvals', 'Approvals'],
    ['audit', 'Audit Trail'],
  ];

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{n.referenceNo}</p>
            <h2 className="text-lg font-bold text-slate-900">{n.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={badges.primary.className}>{badges.primary.label}</span>
              {badges.secondary ? <span className={badges.secondary.className}>{badges.secondary.label}</span> : null}
            </div>
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Close
            </button>
          ) : null}
        </div>
        <OfficeRecordActionBar
          actions={actions}
          canFile={Boolean(ws?.canAccessModule?.('office') && threadId)}
          onFileRecord={() => void fileRecord()}
          onConvertExpense={() => {
            setOpenConvertExpense(true);
            setTab('conversation');
          }}
          onEditBm={() => setBmEditOpen(true)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTimeline()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <RefreshCw size={14} className={loadingTimeline ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {versions.length > 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            Edited by Branch Manager · {versions.length} prior version(s) in audit trail
          </p>
        ) : null}
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-xs font-semibold ${
              tab === id ? 'border-b-2 border-teal-700 text-teal-900' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'overview' ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Branch:</span> {n.branchLabel}
            </p>
            <p>
              <span className="font-semibold">Office:</span> {n.responsibleOffice}
            </p>
            {actions.approvalRouteLabel ? (
              <p className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-teal-950">
                <span className="font-semibold">Approval route:</span> {actions.memoTypeLabel} — next:{' '}
                {actions.approvalRouteLabel}
              </p>
            ) : null}
            <p>{n.previewText || 'No summary.'}</p>
          </div>
        ) : null}
        {tab === 'conversation' && threadId ? (
          <OfficeThreadConversationDrawer
            threadId={threadId}
            isOpen
            variant="inline"
            onDismiss={() => {}}
            openConvertExpense={openConvertExpense}
            onConvertExpenseConsumed={() => setOpenConvertExpense(false)}
          />
        ) : null}
        {tab === 'conversation' && !threadId ? (
          <p className="text-sm text-slate-500">No office thread linked to this work item.</p>
        ) : null}
        {tab === 'timeline' ? <TimelineList events={timeline} /> : null}
        {tab === 'files' ? (
          <p className="text-sm text-slate-500">Use Print or A4 pack on the action bar above.</p>
        ) : null}
        {tab === 'linked' ? (
          <p className="text-sm text-slate-500">Linked expenses and procurement appear after conversion.</p>
        ) : null}
        {tab === 'approvals' ? (
          <p className="text-sm text-slate-500">Approval actions are recorded on the official timeline.</p>
        ) : null}
        {tab === 'audit' ? (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <p className="font-semibold">{v.editedByDisplay || 'Editor'}</p>
                <p className="text-slate-500">{v.createdAtIso}</p>
                {v.editReason ? <p className="mt-1 italic">{v.editReason}</p> : null}
              </div>
            ))}
            {!versions.length ? <p className="text-sm text-slate-500">No edit history.</p> : null}
          </div>
        ) : null}
      </div>

      <OfficeRecordBmEditModal
        open={bmEditOpen}
        thread={actions.thread}
        busy={actions.busy}
        onClose={() => setBmEditOpen(false)}
        onSave={actions.patchByBranchManager}
      />
    </div>
  );
}
