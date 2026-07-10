import { HrButton, HrAddButton, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { SlideOverPanel } from '../layout';
import { apiFetch } from '../../lib/apiBase';
import { hrRequestKindLabel } from '../../lib/hrFormat';
import { hrRequestReviewPath } from '../../lib/hrRequests';
import { HR_EMPLOYEES, HR_TIME_ABSENCE, hrTabPath } from '../../lib/hrRoutes';
import { HrRequestPayloadSummary } from './HrRequestPayloadSummary';
import { HrChairmanWaiverLoanBanner } from './HrChairmanWaiverLoanBanner';
import HrRequestStageBar from './HrRequestStageBar';
import { HrStatusBadge } from './HrStatusBadge';
import { HR_FIELD_CLASS, HR_TEXTAREA_CLASS } from './hrFormStyles';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canGmApproveChairmanWaiverLoan } from '../../lib/hrAccess';

const REASON_CODES = [
  { value: 'policy', label: 'Policy' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'performance', label: 'Performance' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
];

function canReviewRequest(request) {
  const s = String(request?.status || '');
  return s === 'hr_review' || s === 'branch_manager_review' || s === 'gm_hr_review';
}

/**
 * Preview-first HR request panel — approve/reject without leaving dashboard.
 */
export function HrRequestPreviewSlideOver({ request: initialRequest, isOpen, onClose, onReviewed }) {
  const ws = useWorkspace();
  const permissions = ws?.permissions || ws?.session?.permissions || [];
  const roleKey = ws?.session?.roleKey || ws?.roleKey || '';
  const [request, setRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reasonCode, setReasonCode] = useState('policy');

  useEffect(() => {
    setRequest(initialRequest);
    setReviewNote('');
    setError('');
  }, [initialRequest]);

  useEffect(() => {
    if (!isOpen || !initialRequest?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch(`/api/hr/requests?scope=all`);
      setLoading(false);
      if (cancelled || !ok || !data?.ok) return;
      const match = (data.requests || []).find((r) => r.id === initialRequest.id);
      if (match) setRequest(match);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialRequest?.id]);

  const runReview = async (approve) => {
    if (!request?.id) return;
    const path = hrRequestReviewPath(request.id, request.status);
    if (!path) return;
    const note = reviewNote.trim();
    if (note.length < 3) {
      setError('A review note of at least 3 characters is required.');
      return;
    }
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify({ approve, note, reasonCode }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return;
    }
    setReviewNote('');
    onReviewed?.();
    onClose?.();
  };

  const queueHref = `${hrTabPath(HR_TIME_ABSENCE, 'approvals')}&requestId=${encodeURIComponent(request?.id || '')}`;

  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title="HR request" description="Request preview and review" maxWidthClass="max-w-lg">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">HR request</p>
            <h2 className="truncate text-base font-black text-zarewa-teal">{request?.title || hrRequestKindLabel(request?.kind)}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          {loading ? <p className="text-sm text-slate-500">Loading details…</p> : null}
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</p> : null}

          {request ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <HrStatusBadge variant="generic" label={hrRequestKindLabel(request.kind)} />
                <HrStatusBadge variant="request" status={request.status} />
              </div>

              <HrRequestStageBar request={request} />

              <dl className="grid gap-2 text-xs text-slate-700">
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="font-bold text-slate-500">Employee</dt>
                  <dd>
                    {request.staffDisplayName && request.userId ? (
                      <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(request.userId)}`} className="font-semibold text-zarewa-teal hover:underline">
                        {request.staffDisplayName}
                      </Link>
                    ) : (
                      request.userId || '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="font-bold text-slate-500">Updated</dt>
                  <dd className="font-mono">{request.updatedAtIso?.slice(0, 16)?.replace('T', ' ') || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <dt className="font-bold text-slate-500">Request ID</dt>
                  <dd className="font-mono text-ui-xs">{request.id}</dd>
                </div>
              </dl>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="mb-2 text-ui-xs font-bold uppercase tracking-widest text-slate-500">Details</p>
                <HrRequestPayloadSummary request={request} />
              </div>

              <HrChairmanWaiverLoanBanner request={request} permissions={permissions} roleKey={roleKey} />

              {canReviewRequest(request) ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-ui-xs font-bold uppercase tracking-widest text-amber-900">Review action</p>
                  <label className="block text-ui-xs font-bold uppercase text-slate-500">
                    Reason code
                    <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className={`${HR_FIELD_CLASS} mt-1`}>
                      {REASON_CODES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-ui-xs font-bold uppercase text-slate-500">
                    Review note
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      className={`${HR_TEXTAREA_CLASS} mt-1`}
                      placeholder="At least 3 characters…"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <HrButton
                      type="button"
                      
                      disabled={busy || !canGmApproveChairmanWaiverLoan(request, permissions, roleKey)}
                      title={
                        !canGmApproveChairmanWaiverLoan(request, permissions, roleKey)
                          ? 'Chairman or MD must approve this waiver-flagged loan'
                          : undefined
                      }
                      onClick={() => void runReview(true)}
                    >
                      Approve
                    </HrButton>
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-ui-xs font-bold uppercase text-red-900 hover:bg-red-100"
                      disabled={busy}
                      onClick={() => void runReview(false)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 sm:px-5 flex flex-wrap gap-2">
          <Link to={queueHref} className={`${HR_BTN_SECONDARY} no-underline`} onClick={onClose}>
            Open in queue
          </Link>
          {request?.userId ? (
            <Link
              to={`${HR_EMPLOYEES}/${encodeURIComponent(request.userId)}`}
              className={`${HR_BTN_SECONDARY} no-underline`}
              onClick={onClose}
            >
              Staff profile
            </Link>
          ) : null}
        </div>
      </div>
    </SlideOverPanel>
  );
}
