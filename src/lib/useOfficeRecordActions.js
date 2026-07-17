import { appConfirm } from './appConfirm';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useOptionalToast } from '../context/ToastContext';
import { apiFetch } from './apiBase';
import { buildOfficeInternalMemoPackHtml } from './officeMemoPackPrint.js';
import { escapeHtml, openPrintHtmlDocument, openPrintWindow } from './officeDeskPrint.js';
import {
  canConvertMemoToExpense,
  canConvertMemoToProcurement,
  SMART_MEMO_TYPES,
} from './smartMemoComposer.js';
import { normalizeWorkItem } from './workspaceWorkItemModel';

const BRANCH_MANAGER_ROLES = new Set(['sales_manager', 'branch_manager']);

function parseThreadPayload(thread) {
  if (!thread?.payload) return {};
  if (typeof thread.payload === 'object') return thread.payload;
  try {
    return JSON.parse(thread.payload_json || thread.payloadJson || '{}');
  } catch {
    return {};
  }
}

/**
 * Shared office record actions for detail toolbar and conversation drawer.
 */
export function useOfficeRecordActions({ workItem, threadId, onRefresh }) {
  const ws = useWorkspace();
  const { show: showToast } = useOptionalToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const userId = String(ws?.session?.user?.id || '').trim();
  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const n = useMemo(() => (workItem ? normalizeWorkItem(workItem, { userId }) : null), [workItem, userId]);
  const status = String(workItem?.status || detail?.thread?.status || 'open').toLowerCase();
  const thread = detail?.thread;
  const threadPayload = useMemo(() => parseThreadPayload(thread), [thread]);
  const smartMemo = threadPayload.smartMemo || threadPayload;
  const memoTypeKey = smartMemo?.memoType || threadPayload.recordType || 'general_internal';
  const approvalRoute = threadPayload.approvalRoute || smartMemo?.approvalRoute;

  const loadThread = useCallback(async () => {
    const tid = String(threadId || '').trim();
    if (!tid) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await apiFetch(`/api/office/threads/${encodeURIComponent(tid)}`);
      if (ok && data?.ok) setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const postDecision = useCallback(
    async (decisionKey, outcomeStatus, note = '') => {
      const wid = String(workItem?.id || '').trim();
      if (!wid) {
        showToast('No work item linked to this record.', { variant: 'error' });
        return false;
      }
      if (!ws?.canMutate) {
        showToast('Reconnect to apply decisions.', { variant: 'warning' });
        return false;
      }
      setBusy(true);
      try {
        const { ok, data } = await apiFetch(`/api/work-items/${encodeURIComponent(wid)}/decisions`, {
          method: 'POST',
          body: JSON.stringify({
            decisionKey,
            outcomeStatus,
            nextStatus: outcomeStatus,
            note: note || undefined,
            keyDecisionSummary: `${decisionKey}: ${outcomeStatus}`.replace(/_/g, ' '),
          }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not record decision.', { variant: 'error' });
          return false;
        }
        showToast('Decision recorded.', { variant: 'success' });
        await ws.refresh?.();
        await loadThread();
        onRefresh?.();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [workItem?.id, ws, showToast, loadThread, onRefresh]
  );

  const endorse = useCallback(() => {
    const note = window.prompt('Endorsement note (optional)') ?? '';
    return postDecision('endorse', 'endorsed', note);
  }, [postDecision]);

  const returnForInfo = useCallback(() => {
    const note = window.prompt('What information is needed?') ?? '';
    if (!note.trim()) {
      showToast('A note is required when returning a record.', { variant: 'error' });
      return Promise.resolve(false);
    }
    return postDecision('return', 'returned', note.trim());
  }, [postDecision, showToast]);

  const closeRecord = useCallback(async () => {
    if (!(await appConfirm({ title: 'Close record', message: 'Close this office record?' }))) {
      return false;
    }
    return postDecision('close', 'closed', 'Closed from desk');
  }, [postDecision]);

  const nameByUserId = useMemo(() => {
    const m = {};
    for (const u of detail?.directory || ws?.snapshot?.officeDirectory || []) {
      if (u?.id) m[u.id] = u.displayName || u.username || u.id;
    }
    return m;
  }, [detail?.directory, ws?.snapshot?.officeDirectory]);

  const printThreadView = useCallback(() => {
    if (!thread) return;
    const msgs = detail?.messages || [];
    const html = `
      <h1>${escapeHtml(thread.subject || 'Office record')}</h1>
      <p class="meta">${escapeHtml(thread.id || '')}</p>
      ${msgs
        .map((m) => {
          const who = m.kind === 'system' ? 'System' : nameByUserId[m.authorUserId] || m.authorUserId || '—';
          const when = m.createdAtIso ? new Date(m.createdAtIso).toLocaleString() : '';
          return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;"><div style="font-size:11px;color:#64748b;">${escapeHtml(who)} · ${escapeHtml(when)}</div><div class="body">${escapeHtml(m.body)}</div></div>`;
        })
        .join('')}
    `;
    if (!openPrintWindow(thread.subject || 'Office record', html)) {
      showToast('Allow pop-ups to print.', { variant: 'info' });
    }
  }, [thread, detail?.messages, nameByUserId, showToast]);

  const printInternalMemoPack = useCallback(() => {
    if (!thread) return;
    const html = buildOfficeInternalMemoPackHtml({
      thread,
      messages: detail?.messages || [],
      nameByUserId,
      workItem,
      filing: detail?.filing,
      relatedPaymentRequestId: thread.relatedPaymentRequestId,
    });
    if (!openPrintHtmlDocument(html, thread.subject || 'Internal memo pack')) {
      showToast('Allow pop-ups to print.', { variant: 'info' });
    }
  }, [thread, detail, nameByUserId, workItem, showToast]);

  const isBranchManager = BRANCH_MANAGER_ROLES.has(roleKey);
  const canEndorse = isBranchManager && /^(open|submitted|pending|needs.?endorse)/.test(status);
  const canReturn = isBranchManager && !/^(closed|filed|converted)/.test(status);
  const canClose = isBranchManager || roleKey === 'admin' || roleKey === 'md';
  const showClose = canClose && !/^(closed|filed)/.test(status);
  const canConvert =
    thread &&
    thread.status !== 'converted' &&
    String(thread.createdByUserId || '') === userId;
  const userPermissions = ws?.permissions ?? [];
  const canConvertExpense = canConvert && canConvertMemoToExpense(memoTypeKey, userPermissions);
  const canConvertProcurement = canConvert && canConvertMemoToProcurement(memoTypeKey, userPermissions);
  const canEditBm =
    isBranchManager && thread && /^(open|submitted|pending)$/.test(String(thread.status || '').toLowerCase());

  const approvalRouteLabel = useMemo(() => {
    if (!approvalRoute?.steps?.length) return null;
    const pending = approvalRoute.steps[approvalRoute.steps.length - 1];
    return pending?.label || approvalRoute.nextActorRole;
  }, [approvalRoute]);

  const patchByBranchManager = useCallback(
    async ({ subject, body, editReason }) => {
      const tid = String(threadId || '').trim();
      if (!tid) return false;
      setBusy(true);
      try {
        const { ok, data } = await apiFetch(`/api/office/threads/${encodeURIComponent(tid)}`, {
          method: 'PATCH',
          body: JSON.stringify({ subject, body, editReason }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not save edits.', { variant: 'error' });
          return false;
        }
        showToast('Record updated.', { variant: 'success' });
        await loadThread();
        onRefresh?.();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [threadId, showToast, loadThread, onRefresh]
  );

  const submitProcurementConvert = useCallback(async () => {
    const tid = String(threadId || '').trim();
    if (!tid) return false;
    const itemList = String(smartMemo?.guidedFields?.itemList || '').trim();
    if (
      !itemList &&
      !(await appConfirm({
        title: 'Convert memo',
        message: 'No item list in guided fields. Convert anyway?',
      }))
    ) {
      return false;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/office/threads/${encodeURIComponent(tid)}/convert-material-request`,
        { method: 'POST', body: JSON.stringify({ itemList: itemList || undefined }) }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not convert.', { variant: 'error' });
        return false;
      }
      showToast(`Material request ${data.materialRequestId} created.`, { variant: 'success' });
      await ws.refresh?.();
      await loadThread();
      onRefresh?.();
      return true;
    } finally {
      setBusy(false);
    }
  }, [threadId, smartMemo, showToast, ws, loadThread, onRefresh]);

  return {
    detail,
    thread,
    loading,
    busy,
    n,
    status,
    approvalRoute,
    approvalRouteLabel,
    memoTypeLabel: SMART_MEMO_TYPES[memoTypeKey]?.label || memoTypeKey,
    canEndorse,
    canReturn,
    showClose,
    canConvertExpense,
    canConvertProcurement,
    canEditBm,
    endorse,
    returnForInfo,
    closeRecord,
    printThreadView,
    printInternalMemoPack,
    patchByBranchManager,
    submitProcurementConvert,
    reload: loadThread,
  };
}
