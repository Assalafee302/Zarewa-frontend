import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Flag, RefreshCw, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { Button } from '../ui';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { formatPersonName } from '../../lib/formatPersonName';
import {
  editApprovalEntityLabel,
  formatEditApprovalFieldValue,
  normalizeEditApprovalChangeDetails,
} from '../../lib/editApprovalReview';

const ENTITY_ROUTES = {
  quotation: (id) => ({ to: '/sales', state: { openSalesRecord: { type: 'quotation', id } } }),
  purchase_order: (id) => ({ to: '/procurement', state: { focusPoId: id } }),
  production_job: (id) => ({ to: `/manager?inbox=qc&jobId=${encodeURIComponent(id)}` }),
  sales_receipt: () => ({ to: '/sales', state: { focusSalesTab: 'receipts' } }),
  cutting_list: (id) => ({ to: '/sales', state: { openSalesRecord: { type: 'cutting_list', id } } }),
};

function entityRoute(entityKind, entityId) {
  const ek = String(entityKind || '').trim().toLowerCase();
  const eid = String(entityId || '').trim();
  const fn = ENTITY_ROUTES[ek];
  if (!fn || !eid) return null;
  return fn(eid);
}

function entityGuidance(entityKind) {
  const ek = String(entityKind || '').trim().toLowerCase();
  if (ek === 'quotation') {
    return 'The requester wants to change a quotation that already has payment on file. Approving issues a single-use 6-digit code they must enter when saving.';
  }
  if (ek === 'purchase_order') {
    return 'Sensitive procurement edit — approver grants a one-time code for the buyer to complete the save.';
  }
  if (ek === 'production_job') {
    return 'Production job sign-off or correction after manager review rules were triggered.';
  }
  if (ek === 'sales_receipt') {
    return 'Treasury or receipt correction after finance reconciliation was saved.';
  }
  if (ek === 'cutting_list') {
    return 'Cutting list edit after the job was pushed to production.';
  }
  return 'Second-party approval before a sensitive record change is saved.';
}

export function EditApprovalDetailModal({
  isOpen,
  editApprovalId = '',
  inboxRow = null,
  onClose,
  onDecisionComplete,
  canApprove = false,
}) {
  const { show: showToast } = useToast();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    const id = String(editApprovalId || '').trim();
    if (!id) return;
    setLoading(true);
    try {
      const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}`);
      if (ok && data?.approval) setApproval(data.approval);
      else if (inboxRow) setApproval(inboxRow);
      else {
        setApproval(null);
        showToast(data?.error || 'Could not load edit approval.', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [editApprovalId, inboxRow, showToast]);

  useEffect(() => {
    if (!isOpen || !editApprovalId) {
      setApproval(null);
      setRejectReason('');
      return;
    }
    void load();
  }, [isOpen, editApprovalId, load]);

  const record = approval || inboxRow;
  const recordContext = record?.recordContext;
  const entityLabel = useMemo(
    () => recordContext?.entityLabel || editApprovalEntityLabel(record?.entityKind),
    [record?.entityKind, recordContext?.entityLabel]
  );
  const changeSummary = String(record?.changeSummary || '').trim();
  const changeDetails = useMemo(
    () => normalizeEditApprovalChangeDetails(record?.changeDetails),
    [record?.changeDetails]
  );
  const route = useMemo(
    () => entityRoute(record?.entityKind, record?.entityId),
    [record?.entityKind, record?.entityId]
  );

  const handleApprove = async () => {
    const id = String(editApprovalId || record?.id || '').trim();
    if (!id || !canApprove) return;
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
      showToast(`Code ${id} approved — valid for one save (30 minutes).`, { variant: 'success' });
      await onDecisionComplete?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const id = String(editApprovalId || record?.id || '').trim();
    const reason = String(rejectReason || '').trim();
    if (!id || !canApprove) return;
    if (reason.length < 3) {
      showToast('Enter a rejection reason (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not reject.', { variant: 'error' });
        return;
      }
      showToast('Edit request rejected.', { variant: 'success' });
      await onDecisionComplete?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalFrame isOpen={isOpen} onClose={() => !busy && onClose?.()} closeDisabled={busy}>
      <div className="z-modal-panel w-full max-w-lg p-0 overflow-hidden max-h-[min(90vh,720px)] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">Edit approval</p>
            <h3 className="text-lg font-black text-zarewa-teal font-mono mt-1">{editApprovalId || record?.id || '—'}</h3>
            {recordContext?.headline ? (
              <p className="mt-1 text-sm font-semibold text-slate-700">{recordContext.headline}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose?.()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <RefreshCw size={20} className="animate-spin text-zarewa-teal" />
            <span className="text-sm font-semibold">Loading request…</span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            <section className="rounded-xl border border-teal-200/80 bg-teal-50/40 px-4 py-3">
              <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">What will be edited</p>
              {changeSummary ? (
                <p className="mt-2 text-sm font-semibold text-slate-900 leading-relaxed">{changeSummary}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Sensitive save on this {entityLabel.toLowerCase()} — review the record snapshot below before approving.
                </p>
              )}
              {changeDetails.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-teal-200/70 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/90 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Current</th>
                        <th className="px-3 py-2">Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeDetails.map((row) => (
                        <tr key={row.label} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                          <td className="px-3 py-2 text-slate-600">{formatEditApprovalFieldValue(row.from)}</td>
                          <td className="px-3 py-2 font-semibold text-zarewa-teal">
                            {formatEditApprovalFieldValue(row.to)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>

            {Array.isArray(recordContext?.fields) && recordContext.fields.length > 0 ? (
              <section>
                <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  {entityLabel} snapshot
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {recordContext.fields.map((f) => (
                    <div key={f.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                      <dt className="text-ui-xs font-bold uppercase text-slate-400">{f.label}</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5 break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                  <dt className="text-ui-xs font-bold uppercase text-slate-400">Record</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {entityLabel} · <span className="font-mono">{record?.entityId || '—'}</span>
                  </dd>
                </div>
              </dl>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
              <p className="text-ui-xs font-bold uppercase text-slate-400">Requested by</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatPersonName(record?.requestedByDisplay || record?.requestedByUserId || '—')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{record?.requestedAtISO || ''}</p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{entityGuidance(record?.entityKind)}</p>

            {route ? (
              <Link
                to={route.to}
                state={route.state}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zarewa-teal hover:underline"
                onClick={() => onClose?.()}
              >
                View source record
              </Link>
            ) : null}

            {!canApprove ? (
              <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You can view this request but cannot approve or reject it.
              </p>
            ) : null}
            </div>

            {canApprove ? (
              <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
                <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
                  Rejection reason (required to reject)
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Why is this edit not approved?"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </label>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void handleReject()}>
                    <Flag size={14} />
                    Reject
                  </Button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleApprove()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:brightness-105 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Approve code
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ModalFrame>
  );
}
