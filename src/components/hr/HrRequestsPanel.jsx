import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
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
  const ws = useWorkspace();
  const [scope, setScope] = useState(defaultScope);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams({ scope });
    if (kindFilter) q.set('kind', kindFilter);
    const { ok, data } = await apiFetch(`/api/hr/requests?${q}`);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load requests.');
      setRequests([]);
    } else {
      setRequests(data.requests || []);
    }
    setLoading(false);
  }, [scope, kindFilter, ws?.refreshEpoch]);

  useEffect(() => {
    load();
  }, [load]);

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
    setBusyId(requestId);
    const { ok, data } = await apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify({ approve, note: reviewNote.trim() || undefined }),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowedScopes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
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
      {loading ? <p className="text-sm text-slate-600">Loading requests…</p> : null}

      {!loading ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
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
                  <AppTableTd colSpan={6} align="center">
                    <span className="text-slate-500 py-4 block">No requests in this queue.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                requests.map((r) => (
                  <AppTableTr key={r.id}>
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
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            rows={2}
                            placeholder="Optional note"
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
