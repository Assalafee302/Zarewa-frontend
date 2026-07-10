import React, { useState } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { useEditApprovalsPending } from '../../hooks/useEditApprovalsPending';

/**
 * Compact dashboard container for designated roles to approve second-party edit tokens.
 * Mirrors `src/pages/EditApprovalsPage.jsx` without page shell/layout.
 */
export default function EditApprovalsPanel() {
  const ws = useWorkspace();
  const wsRefreshEditApprovalsPending = ws?.refreshEditApprovalsPending;
  const { show: showToast } = useToast();
  const { items, loading, reload } = useEditApprovalsPending(Boolean(ws?.hasWorkspaceData));
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const result = await reload();
    if (result.error) {
      showToast(result.error.message || 'Could not load pending edit approvals.', { variant: 'error' });
    }
    await (wsRefreshEditApprovalsPending?.() ?? Promise.resolve());
  };

  const approve = async (id) => {
    setBusyId(id);
    const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not approve.', { variant: 'error' });
      return;
    }
    showToast('Edit approval granted — the colleague can save once with this token.');
    await load();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Edit approvals</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Approve one-time codes so colleagues can complete protected saves.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-ui-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-zarewa-teal" />
          <p className="text-xs font-bold uppercase tracking-widest">Loading queue</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
          <ClipboardCheck size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No pending edit approvals</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3"
            >
              <div className="min-w-0">
                <p className="text-ui-xs font-mono font-bold text-slate-700">{e.id}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {e.entityKind} · <span className="font-mono text-[13px]">{e.entityId}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {e.changeSummary ? <span className="text-violet-900">{e.changeSummary} · </span> : null}
                  Requested by {e.requestedByDisplay || e.requestedByUserId || '—'}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === e.id}
                onClick={() => void approve(e.id)}
                className="shrink-0 rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-white hover:brightness-105 disabled:opacity-50"
              >
                {busyId === e.id ? 'Approving…' : 'Approve'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
