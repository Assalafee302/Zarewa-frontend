import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
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

const SCOPE_LABELS = {
  mine: 'My requests',
  hr_queue: 'HR review',
  endorse_queue: 'Branch endorsements',
  gm_queue: 'GM HR final',
  all: 'All requests',
};

/**
 * Shared HR requests list with optional approval actions.
 * @param {{ allowedScopes: string[]; defaultScope?: string; kindFilter?: string; staffLinkBase?: string }} props
 */
export function HrRequestsPanel({
  allowedScopes = ['mine'],
  defaultScope = 'mine',
  kindFilter = '',
  staffLinkBase = '/hr/staff',
}) {
  const [scope, setScope] = useState(defaultScope);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reasonCode, setReasonCode] = useState('policy');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkRejectPrompt, setShowBulkRejectPrompt] = useState(false);

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

  const canReviewRow = useCallback(
    (r) =>
      (scope === 'hr_queue' && r.status === 'hr_review') ||
      (scope === 'endorse_queue' && r.status === 'branch_manager_review') ||
      (scope === 'gm_queue' && r.status === 'gm_hr_review'),
    [scope]
  );

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowedScopes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setScope(s); setSelectedIds([]); }}
            className={`rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
              scope === s
                ? 'bg-[#134e4a] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {SCOPE_LABELS[s] || s}
          </button>
        ))}
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

      {!loading || requests.length > 0 ? (
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
              ) : <AppTableTh />}
              <AppTableTh>Title</AppTableTh>
              <AppTableTh>Kind</AppTableTh>
              <AppTableTh>Employee</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh>Submitted</AppTableTh>
              <AppTableTh>Actions</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {requests.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={7} align="center">
                    <span className="text-slate-500 py-4 block">No requests in this queue.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                requests.map((r) => (
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
                    <AppTableTd>
                      {r.userId ? (
                        <Link
                          to={`${staffLinkBase}/${encodeURIComponent(r.userId)}`}
                          className="font-semibold text-[#134e4a] hover:underline"
                        >
                          {r.staffDisplayName || r.userId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </AppTableTd>
                    <AppTableTd>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${hrRequestStatusClass(r.status)}`}
                      >
                        {hrRequestStatusLabel(r.status)}
                      </span>
                    </AppTableTd>
                    <AppTableTd monospace>{r.submittedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                    <AppTableTd>
                      <div className="flex flex-wrap gap-1">
                        {r.status === 'draft' && scope === 'mine' ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => submitDraft(r.id)}
                              className="rounded-lg bg-[#134e4a] px-2 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-50"
                            >
                              Submit
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => deleteDraft(r.id)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                        {canReviewRow(r) ? (
                          <button
                            type="button"
                            onClick={() => setReviewId(reviewId === r.id ? '' : r.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-[#134e4a]"
                          >
                            Review
                          </button>
                        ) : null}
                      </div>
                      {reviewId === r.id ? (
                        <div className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                          <select
                            value={reasonCode}
                            onChange={(e) => setReasonCode(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
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
                            rows={2}
                            placeholder="Review note (required, min 3 characters)"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => runReview(r.id, r.status, true)}
                              className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-bold uppercase text-white"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => runReview(r.id, r.status, false)}
                              className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-bold uppercase text-white"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </div>
  );
}
