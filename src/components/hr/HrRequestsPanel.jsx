import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { generateLeaveDecisionLetter } from '../../lib/hrPhase2';
import { generateStaffLoanAgreementLetter } from '../../lib/hrExtended';
import { canGenerateHrLetters } from '../../lib/hrAccess';
import {
  hrRequestKindLabel,
  hrRequestStatusClass,
  hrRequestStatusLabel,
} from '../../lib/hrFormat';
import { hrRequestReviewPath } from '../../lib/hrRequests';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { HrRequestPayloadSummary, hrRequestApprovalChain } from './HrRequestPayloadSummary';
import HrRequestStageBar from './HrRequestStageBar';
import { HR_BTN_PILL, HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS, HR_TEXTAREA_CLASS } from './hrFormStyles';

const SCOPE_LABELS = {
  mine: 'My requests',
  hr_queue: 'HR review',
  endorse_queue: 'Branch endorsements',
  gm_queue: 'GM HR final',
  all: 'All requests',
};

/**
 * Shared HR requests list with optional approval actions.
 * @param {{ allowedScopes: string[]; defaultScope?: string; kindFilter?: string; kindsInclude?: string[]; hideKindFilter?: boolean; staffLinkBase?: string; focusRequestId?: string; showStageBar?: boolean }} props
 */
export function HrRequestsPanel({
  allowedScopes = ['mine'],
  defaultScope = 'mine',
  kindFilter = '',
  kindsInclude = null,
  hideKindFilter = false,
  staffLinkBase = '/hr/staff',
  focusRequestId = '',
  showStageBar = false,
}) {
  const ws = useWorkspace();
  const canLetter = canGenerateHrLetters(ws?.session?.permissions);
  const [scope, setScope] = useState(defaultScope);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reasonCode, setReasonCode] = useState('policy');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkRejectPrompt, setShowBulkRejectPrompt] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterKindLocal, setFilterKindLocal] = useState('');

  const REASON_CODES = [
    { value: 'policy', label: 'Policy' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'performance', label: 'Performance' },
    { value: 'finance', label: 'Finance' },
    { value: 'other', label: 'Other' },
  ];

  const { loading, error, setError, reload: load } = useHrListLoad(async () => {
    const q = new URLSearchParams({ scope });
    if (kindFilter) q.set('kind', kindFilter);
    const { ok, data } = await apiFetch(`/api/hr/requests?${q}`);
    if (!ok || !data?.ok) {
      setRequests([]);
      return { error: data?.error || 'Could not load requests.', hasData: false };
    }
    setRequests(data.requests || []);
    return { hasData: true };
  }, [scope, kindFilter]);

  useEffect(() => {
    if (defaultScope && allowedScopes.includes(defaultScope)) {
      setScope(defaultScope);
    }
  }, [defaultScope, allowedScopes]);

  const canReviewRow = useCallback(
    (r) =>
      (scope === 'hr_queue' && r.status === 'hr_review') ||
      (scope === 'endorse_queue' && r.status === 'branch_manager_review') ||
      (scope === 'gm_queue' && r.status === 'gm_hr_review'),
    [scope]
  );

  useEffect(() => {
    if (!focusRequestId || loading) return;
    const match = requests.find((r) => r.id === focusRequestId);
    if (!match) return;
    setExpandedId(focusRequestId);
    if (canReviewRow(match)) setReviewId(focusRequestId);
  }, [focusRequestId, requests, loading, canReviewRow]);

  const runReview = async (requestId, status, approve) => {
    const path = hrRequestReviewPath(requestId, status);
    if (!path) return;
    const note = reviewNote.trim();
    if (note.length < 3) {
      setError('A review note of at least 3 characters is required.');
      return;
    }
    setBusyId(requestId);
    const { ok, data } = await apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify({ approve, note, reasonCode }),
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return;
    }
    setReviewId('');
    setReviewNote('');
    await load();
  };

  const submitDraft = async (requestId) => {
    setBusyId(requestId);
    const { ok, data } = await apiFetch(`/api/hr/requests/${encodeURIComponent(requestId)}/submit`, {
      method: 'PATCH',
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not submit request.');
      return;
    }
    await load();
  };

  const deleteDraft = async (requestId) => {
    if (!window.confirm('Delete this draft request?')) return;
    setBusyId(requestId);
    const { ok, data } = await apiFetch(`/api/hr/requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not delete request.');
      return;
    }
    await load();
  };

  const reviewableRequests = requests.filter((r) => canReviewRow(r));
  const allReviewableSelected =
    reviewableRequests.length > 0 && reviewableRequests.every((r) => selectedIds.includes(r.id));

  const visibleRequests = useMemo(() => {
    let rows = requests;
    if (kindsInclude?.length) {
      const allowed = new Set(kindsInclude);
      rows = rows.filter((r) => allowed.has(r.kind));
    }
    const kind = kindFilter || filterKindLocal;
    if (kind) rows = rows.filter((r) => r.kind === kind);
    const q = filterSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.title, r.kind, r.status, r.staffDisplayName, r.userId, r.id].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [requests, kindFilter, filterKindLocal, filterSearch, kindsInclude]);

  const exportQueueCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['ID', 'Title', 'Kind', 'Status', 'Employee', 'Submitted'];
    const lines = visibleRequests.map((r) =>
      [r.id, r.title, r.kind, r.status, r.staffDisplayName || r.userId, r.submittedAtIso?.slice(0, 10)].map(esc).join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-requests-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (allReviewableSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviewableRequests.map((r) => r.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const bulkReview = async (approve, rejectionNote) => {
    const ids = selectedIds.slice();
    setBulkProgress(`Processing 0 of ${ids.length}…`);
    let done = 0;
    for (const id of ids) {
      const req = requests.find((r) => r.id === id);
      if (!req) { done++; continue; }
      const path = hrRequestReviewPath(id, req.status);
      if (!path) { done++; continue; }
      await apiFetch(path, {
        method: 'PATCH',
        body: JSON.stringify({
          approve,
          note: approve ? 'Bulk approved' : (rejectionNote || 'Bulk rejected'),
          reasonCode: approve ? 'policy' : 'other',
        }),
      });
      done++;
      setBulkProgress(`${approve ? 'Approving' : 'Rejecting'} ${done} of ${ids.length}…`);
    }
    setBulkProgress('');
    setSelectedIds([]);
    setShowBulkRejectPrompt(false);
    setBulkRejectReason('');
    await load();
  };

  const showEmployeeColumn = scope !== 'mine' && staffLinkBase !== '/me';

  const renderEmployeeCell = (r) => {
    if (!r.userId) return '—';
    if (!showEmployeeColumn) return r.staffDisplayName || 'You';
    return (
      <Link
        to={`${staffLinkBase}/${encodeURIComponent(r.userId)}`}
        className="font-semibold text-[#134e4a] hover:underline"
      >
        {r.staffDisplayName || r.userId}
      </Link>
    );
  };

  const renderRequestActions = (r) => (
    <>
      <div className="flex flex-wrap gap-2">
        {r.status === 'draft' && scope === 'mine' ? (
          <>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => submitDraft(r.id)}
              className={`${HR_BTN_PILL} bg-[#134e4a] text-white disabled:opacity-50`}
            >
              Submit
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => deleteDraft(r.id)}
              className={`${HR_BTN_PILL} border border-slate-200 bg-white text-slate-600`}
            >
              Delete
            </button>
          </>
        ) : null}
        {canReviewRow(r) ? (
          <button
            type="button"
            onClick={() => {
              setReviewId(reviewId === r.id ? '' : r.id);
              setReviewNote('');
            }}
            className={`${HR_BTN_PILL} border border-slate-200 bg-white text-[#134e4a]`}
          >
            Review
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setExpandedId(expandedId === r.id ? '' : r.id)}
          className={`${HR_BTN_PILL} border border-slate-200 bg-white text-slate-600`}
        >
          {expandedId === r.id ? 'Hide' : 'Details'}
        </button>
        {canLetter && r.kind === 'leave' && r.status === 'approved' ? (
          <button
            type="button"
            disabled={busyId === r.id}
            onClick={async () => {
              setBusyId(r.id);
              await generateLeaveDecisionLetter(r.id, 'leave_approval');
              setBusyId('');
            }}
            className={`${HR_BTN_PILL} border border-teal-200 bg-teal-50 text-teal-800`}
          >
            Approval letter
          </button>
        ) : null}
        {canLetter && r.kind === 'leave' && ['rejected', 'hr_rejected', 'gm_rejected'].includes(r.status) ? (
          <button
            type="button"
            disabled={busyId === r.id}
            onClick={async () => {
              setBusyId(r.id);
              await generateLeaveDecisionLetter(r.id, 'leave_rejection');
              setBusyId('');
            }}
            className={`${HR_BTN_PILL} border border-slate-200 bg-white text-slate-600`}
          >
            Rejection letter
          </button>
        ) : null}
        {canLetter && r.kind === 'loan' && r.status === 'approved' ? (
          <button
            type="button"
            disabled={busyId === r.id}
            onClick={async () => {
              setBusyId(r.id);
              await generateStaffLoanAgreementLetter(r.id);
              setBusyId('');
            }}
            className={`${HR_BTN_PILL} border border-teal-200 bg-teal-50 text-teal-800`}
          >
            Loan agreement
          </button>
        ) : null}
      </div>
      {expandedId === r.id ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
          {showStageBar ? <HrRequestStageBar status={r.status} kind={r.kind} /> : null}
          <HrRequestPayloadSummary request={r} compact />
          {r.reviewNotes?.length ? (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Approval history</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {r.reviewNotes.map((n, i) => (
                  <li key={i}>{n.atIso?.slice(0, 16)} — {n.note || n.action}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {reviewId === r.id ? (
        <div className="mt-3 space-y-3 rounded-xl border border-[#134e4a]/20 bg-teal-50/40 p-3">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <p><span className="text-slate-500">Employee:</span> <strong>{r.staffDisplayName || r.userId}</strong></p>
            <p><span className="text-slate-500">Branch:</span> {r.branchId || '—'}</p>
            <p><span className="text-slate-500">Department:</span> {r.department || '—'}</p>
            <p><span className="text-slate-500">Kind:</span> {hrRequestKindLabel(r.kind)}</p>
          </div>
          <HrRequestPayloadSummary request={r} compact />
          {(() => {
            const { chain, currentIdx } = hrRequestApprovalChain(r.status, r.kind);
            return (
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Approval chain</p>
                <div className="flex flex-wrap gap-1.5">
                  {chain.map((step, i) => (
                    <span
                      key={step}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        i <= currentIdx ? 'bg-[#134e4a] text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className={`${HR_FIELD_CLASS} mt-0 text-sm`}
            aria-label="Reason code"
          >
            {REASON_CODES.map((rc) => (
              <option key={rc.value} value={rc.value}>
                {rc.label}
              </option>
            ))}
          </select>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
            placeholder="Review note (required, min 3 characters)"
            className={`${HR_TEXTAREA_CLASS} mt-0 text-sm`}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => runReview(r.id, r.status, true)}
              className={`${HR_BTN_PRIMARY} bg-emerald-700 hover:bg-emerald-800`}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => runReview(r.id, r.status, false)}
              className={`${HR_BTN_PRIMARY} bg-red-700 hover:bg-red-800`}
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowedScopes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setScope(s); setSelectedIds([]); }}
            className={`${HR_BTN_PILL} ${
              scope === s
                ? 'bg-[#134e4a] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {SCOPE_LABELS[s] || s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!kindFilter && !hideKindFilter && !kindsInclude?.length ? (
          <select
            value={filterKindLocal}
            onChange={(e) => setFilterKindLocal(e.target.value)}
            className={`${HR_FIELD_CLASS} max-w-[160px] text-xs`}
            aria-label="Filter by request kind"
          >
            <option value="">All kinds</option>
            <option value="leave">Leave</option>
            <option value="loan">Loan</option>
            <option value="profile_change">Profile change</option>
          </select>
        ) : null}
        <input
          type="search"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search title, employee…"
          className={`${HR_FIELD_CLASS} min-w-[180px] flex-1 text-sm`}
        />
        {scope !== 'mine' ? (
          <button type="button" onClick={exportQueueCsv} className={HR_BTN_SECONDARY}>
            Export CSV
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {loading && requests.length === 0 ? (
        <p className="text-sm text-slate-600">Loading requests…</p>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#134e4a]/20 bg-teal-50/60 px-4 py-2.5 text-sm">
          <span className="font-semibold text-[#134e4a]">{selectedIds.length} request{selectedIds.length !== 1 ? 's' : ''} selected</span>
          <span className="text-slate-400">→</span>
          {bulkProgress ? (
            <span className="text-sm text-slate-600">{bulkProgress}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => bulkReview(true, '')}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
              >
                Approve All
              </button>
              <button
                type="button"
                onClick={() => setShowBulkRejectPrompt(true)}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-600"
              >
                Clear
              </button>
            </>
          )}
        </div>
      ) : null}

      {showBulkRejectPrompt ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">Rejection reason (applies to all {selectedIds.length} selected)</p>
          <textarea
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            rows={2}
            placeholder="Enter rejection reason…"
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => bulkReview(false, bulkRejectReason)}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
            >
              Confirm Reject All
            </button>
            <button
              type="button"
              onClick={() => { setShowBulkRejectPrompt(false); setBulkRejectReason(''); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!loading || visibleRequests.length > 0 ? (
        <>
          <div className="md:hidden space-y-3">
            {visibleRequests.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No requests in this queue.
              </p>
            ) : (
              visibleRequests.map((r) => (
                <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {canReviewRow(r) ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${r.title || 'request'}`}
                        className="mt-1 rounded"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold leading-snug text-slate-900">{r.title || 'Request'}</h4>
                        <span
                          className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${hrRequestStatusClass(r.status)}`}
                        >
                          {hrRequestStatusLabel(r.status)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="font-bold uppercase tracking-wide text-slate-400">Kind</dt>
                          <dd className="mt-0.5 font-semibold text-slate-800">{hrRequestKindLabel(r.kind)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold uppercase tracking-wide text-slate-400">Submitted</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">{r.submittedAtIso?.slice(0, 10) || '—'}</dd>
                        </div>
                        {showEmployeeColumn ? (
                          <div className="col-span-2">
                            <dt className="font-bold uppercase tracking-wide text-slate-400">Employee</dt>
                            <dd className="mt-0.5">{renderEmployeeCell(r)}</dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-4">{renderRequestActions(r)}</div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  {reviewableRequests.length > 0 ? (
                    <AppTableTh>
                      <input
                        type="checkbox"
                        checked={allReviewableSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all reviewable requests"
                        className="rounded"
                      />
                    </AppTableTh>
                  ) : (
                    <AppTableTh />
                  )}
                  <AppTableTh>Title</AppTableTh>
                  <AppTableTh>Kind</AppTableTh>
                  {showEmployeeColumn ? <AppTableTh>Employee</AppTableTh> : null}
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh>Submitted</AppTableTh>
                  <AppTableTh>Actions</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {visibleRequests.length === 0 ? (
                    <AppTableTr>
                      <AppTableTd colSpan={showEmployeeColumn ? 7 : 6} align="center">
                        <span className="text-slate-500 py-4 block">No requests in this queue.</span>
                      </AppTableTd>
                    </AppTableTr>
                  ) : (
                    visibleRequests.map((r) => (
                      <AppTableTr key={r.id}>
                        <AppTableTd>
                          {canReviewRow(r) ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r.id)}
                              onChange={() => toggleSelect(r.id)}
                              aria-label={`Select request ${r.title || r.id}`}
                              className="rounded"
                            />
                          ) : null}
                        </AppTableTd>
                        <AppTableTd title={r.title}>{r.title}</AppTableTd>
                        <AppTableTd>{hrRequestKindLabel(r.kind)}</AppTableTd>
                        {showEmployeeColumn ? <AppTableTd>{renderEmployeeCell(r)}</AppTableTd> : null}
                        <AppTableTd>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${hrRequestStatusClass(r.status)}`}
                          >
                            {hrRequestStatusLabel(r.status)}
                          </span>
                        </AppTableTd>
                        <AppTableTd monospace>{r.submittedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                        <AppTableTd>{renderRequestActions(r)}</AppTableTd>
                      </AppTableTr>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </>
      ) : null}
    </div>
  );
}
