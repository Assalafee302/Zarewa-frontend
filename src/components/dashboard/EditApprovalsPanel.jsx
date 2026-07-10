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
