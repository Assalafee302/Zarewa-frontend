import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const ID_CARD_REASONS = [
  { value: 'new', label: 'New employee — first ID card' },
  { value: 'lost', label: 'Lost / stolen card' },
  { value: 'damaged', label: 'Damaged card' },
  { value: 'name_change', label: 'Name/detail change' },
  { value: 'expired', label: 'Expired card' },
  { value: 'other', label: 'Other' },
];

function statusBadge(status) {
  const cls =
    status === 'approved' || status === 'issued'
      ? 'bg-emerald-50 text-emerald-800'
      : status === 'rejected'
        ? 'bg-red-50 text-red-800'
        : 'bg-amber-50 text-amber-800';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {String(status || '—').replace(/_/g, ' ')}
    </span>
  );
}

export default function MyIdCard() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;

  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('new');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/api/hr/requests?scope=mine&kind=id_card&limit=20');
    setLoading(false);
    if (!ok || !data?.ok) {
      setListError(data?.error || 'Could not load ID card requests.');
      return;
    }
    setRequests(data.requests || []);
    setListError('');
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const resetForm = () => {
    setReason('new');
    setNotes('');
    setError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError('');
    setMessage('');

    const reasonLabel = ID_CARD_REASONS.find((r) => r.value === reason)?.label || reason;

    // Create request
    const created = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'id_card',
        title: `ID card request — ${reasonLabel}`,
        body: notes.trim() || null,
        payload: { reason, notes: notes.trim() || null },
      }),
    });

    if (!created.ok || !created.data?.ok) {
      setBusy(false);
      setError(created.data?.error || 'Could not create ID card request.');
      return;
    }

    const id = created.data.request?.id;

    // Auto-submit
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, {
      method: 'PATCH',
    });

    setBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      setError(submitted.data?.error || 'Request created but could not submit automatically.');
      await loadRequests();
      return;
    }

    setMessage('ID card request submitted successfully. HR will process it shortly.');
    closeModal();
    await loadRequests();
  };

  return (
    <HrPageBody>
      <HrPageIntro
        title="ID card"
        description="Request a new or replacement employee ID card. HR processes and issues the card after approval."
        actions={<HrAddFormButton onClick={() => setModalOpen(true)}>Request ID card</HrAddFormButton>}
      />

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      {/* Apply modal */}
      <HrFormModal isOpen={modalOpen} onClose={closeModal} title="Request employee ID card" size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Your name, job title, and photo will be sourced from your staff profile automatically. Ensure your profile
            is up to date before submitting.
          </div>

          <label className="text-xs font-semibold text-slate-600 block">
            Reason for request
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={HR_FIELD_CLASS}
              required
            >
              {ID_CARD_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600 block">
            Additional notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${HR_FIELD_CLASS} min-h-[72px]`}
              placeholder="Any extra details HR should know…"
            />
          </label>

          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </HrFormModal>

      <ProfileOverviewSection title="My ID card requests" subtitle="Track submitted and approved requests">
        {listError ? <ProfileInlineAlert variant="error">{listError}</ProfileInlineAlert> : null}
        {loading ? <ProfileMetricSkeleton count={1} /> : null}
        {!loading && !listError && requests.length === 0 ? (
          <ProfileEmptyState
            title="No ID card requests yet"
            description="Use Request ID card above when you need a first card, replacement, or update after a name change."
          />
        ) : null}
        {!loading && requests.length > 0 ? (
          <>
            <div className="md:hidden space-y-3">
              {requests.map((r) => (
                <article
                  key={`${r.id}-m`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{r.title || 'ID card request'}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Submitted{' '}
                    {r.submittedAtIso ? String(r.submittedAtIso).slice(0, 10) : r.createdAtIso?.slice(0, 10) || '—'}
                  </p>
                  {r.body ? <p className="mt-2 text-sm text-slate-600">{r.body}</p> : null}
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Title</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh>Submitted</AppTableTh>
                    <AppTableTh>Notes</AppTableTh>
                  </AppTableThead>
                  <AppTableBody>
                    {requests.map((r) => (
                      <AppTableTr key={r.id}>
                        <AppTableTd>{r.title || 'ID card request'}</AppTableTd>
                        <AppTableTd>{statusBadge(r.status)}</AppTableTd>
                        <AppTableTd>
                          {r.submittedAtIso ? String(r.submittedAtIso).slice(0, 10) : r.createdAtIso?.slice(0, 10) || '—'}
                        </AppTableTd>
                        <AppTableTd>{r.body || '—'}</AppTableTd>
                      </AppTableTr>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            </div>
          </>
        ) : null}
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
