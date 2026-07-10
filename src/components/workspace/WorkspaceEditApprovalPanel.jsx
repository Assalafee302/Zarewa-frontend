import React, { useCallback, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { userCanApproveEditMutationsClient } from '../../lib/editApprovalUi';

/**
 * Grant edit-token approval from the workspace inbox (no Manager page).
 */
export default function WorkspaceEditApprovalPanel({ item, onDone }) {
  const ws = useWorkspace();
  const wsCanMutate = ws?.canMutate;
  const wsRefresh = ws?.refresh;
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const id = String(item?.sourceId || item?.referenceNo || '').trim();
  const permissions = ws?.permissions ?? [];
  const roleKey = ws?.session?.user?.roleKey;
  const canApproveEdit = userCanApproveEditMutationsClient(roleKey, permissions);

  const approve = useCallback(async () => {
    if (!id) return;
    if (!wsCanMutate) {
      showToast('Reconnect to approve — workspace is read-only.', { variant: 'info' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not approve.', { variant: 'error' });
        return;
      }
      showToast('Edit approval granted — one save is allowed with this token.');
      await wsRefresh?.();
      onDone?.();
    } finally {
      setBusy(false);
    }
  }, [id, onDone, showToast, wsCanMutate, wsRefresh]);

  if (!id) {
    return <p className="p-4 text-sm text-slate-500">Missing approval id.</p>;
  }

  const summary = String(item?.summary || '').trim() || '—';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white px-4 py-5">
      <p className="text-ui-xs font-semibold uppercase tracking-wide text-teal-900/80">Edit approval</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{item?.title || 'Edit approval'}</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">{id}</p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm text-slate-800">
        <p className="text-xs font-semibold uppercase text-slate-500">Target</p>
        <p className="mt-1">{summary}</p>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Approving issues a short-lived token so the requester can complete their controlled save.
      </p>
      {!canApproveEdit ? (
        <ZareApprovalHint
          className="mt-4"
          context={{
            referenceNo: id,
            documentType: 'edit_approval',
            status: item?.status,
            canApprove: false,
            missingPermission: 'Only designated managers can grant edit-approval tokens.',
            zareQuery: `Why can't I approve edit approval ${id}?`,
          }}
        />
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canApproveEdit}
          onClick={() => void approve()}
          className="inline-flex items-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f3d3a] disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Approve edit'}
        </button>
      </div>
    </div>
  );
}
