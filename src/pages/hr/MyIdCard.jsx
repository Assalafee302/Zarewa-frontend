import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrIdCardApplyFields } from '../../components/hr/HrIdCardApplyFields';
import { IdCardPreview } from '../../components/hr/IdCardPreview';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import { createHrIdCardRequest, fetchHrIdCards } from '../../lib/hrIdCards';
import {
  blankIdCardApplyForm,
  bloodGroupFromStaff,
  buildIdCardPreviewPerson,
  buildIdCardPreviewRequest,
  emergencyContactFromStaff,
  hasOpenIdCardRequest,
  idCardApplyPayload,
  idCardProfileWarnings,
  idCardRequestTitle,
  idCardStatusVariant,
  validateIdCardApplyForm,
} from '../../lib/hrIdCardForm';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function statusChip(status) {
  return (
    <ProfileStatusChip variant={idCardStatusVariant(status)}>
      {String(status || '—').replace(/_/g, ' ')}
    </ProfileStatusChip>
  );
}

export default function MyIdCard() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;

  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [form, setForm] = useState(blankIdCardApplyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [staff, setStaff] = useState(null);
  const [profileWarnings, setProfileWarnings] = useState([]);

  const loadRequests = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchHrIdCards(userId);
      setRequests(data);
      setListError('');
    } catch {
      setListError('Could not load ID card requests.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadStaff = useCallback(async () => {
    if (!userId) return;
    const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}`);
    if (!ok || !data?.ok) return;
    const row = data.staff || null;
    setStaff(row);
    setProfileWarnings(idCardProfileWarnings(row, row?.avatarUrl || ws?.session?.user?.avatarUrl));
  }, [userId, ws?.session?.user?.avatarUrl]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const resetForm = () => {
    setForm({
      ...blankIdCardApplyForm(),
      bloodGroup: bloodGroupFromStaff(staff),
      emergencyContact: emergencyContactFromStaff(staff),
    });
    setError('');
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openDraftPreview = () => {
    setPreviewRequest(buildIdCardPreviewRequest(staff, form));
    setPreviewOpen(true);
  };

  const openRequestPreview = (request) => {
    setPreviewRequest(request);
    setPreviewOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const validation = validateIdCardApplyForm(form);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    if (hasOpenIdCardRequest(requests)) {
      setError('You already have an open ID card request. Wait for HR to process it before submitting another.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const { ok, data } = await createHrIdCardRequest(idCardApplyPayload(form, userId));
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not create ID card request.');
        return;
      }
      setMessage('ID card request submitted successfully. HR will process it shortly.');
      closeModal();
      await loadRequests();
    } catch {
      setError('Could not create ID card request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const hasOpenRequest = hasOpenIdCardRequest(requests);
  const previewPerson = useMemo(() => buildIdCardPreviewPerson(staff), [staff]);

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="ID card"
        description="Request a new or replacement employee ID card. HR processes and issues the card after approval."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openDraftPreview}
              disabled={!staff}
              className={HR_BTN_SECONDARY}
            >
              Preview card
            </button>
            <HrAddFormButton onClick={openModal} disabled={hasOpenRequest}>
              {hasOpenRequest ? 'Request in progress' : 'Request ID card'}
            </HrAddFormButton>
          </div>
        }
      />

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}
      {hasOpenRequest ? (
        <ProfileInlineAlert variant="info">
          You have an open ID card request. HR will update the status as your card is processed.
        </ProfileInlineAlert>
      ) : null}

      <HrFormModal isOpen={modalOpen} onClose={closeModal} title="Request employee ID card" size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          <HrIdCardApplyFields
            form={form}
            setForm={setForm}
            profileWarnings={profileWarnings}
            showProfileBanner
          />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openDraftPreview} className={HR_BTN_SECONDARY}>
              Preview card
            </button>
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="ID card preview" size="sm">
        {previewRequest ? (
          <IdCardPreview
            request={previewRequest}
            person={previewPerson || previewRequest}
            onClose={() => setPreviewOpen(false)}
            temporary={previewRequest.requestType === 'temporary'}
          />
        ) : null}
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
            <div className="space-y-2 md:hidden">
              {requests.map((r) => (
                <ProfileListRow key={`${r.id}-m`}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{idCardRequestTitle(r)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Requested {r.createdAt?.slice(0, 10) || r.requestedAt?.slice(0, 10) || '—'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openRequestPreview(r)}
                      className="text-[10px] font-bold text-[#134e4a] hover:underline"
                    >
                      Preview
                    </button>
                    {statusChip(r.status)}
                  </span>
                </ProfileListRow>
              ))}
            </div>
            <div className="hidden md:block">
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Request</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh>Requested</AppTableTh>
                    <AppTableTh>Notes</AppTableTh>
                    <AppTableTh>Preview</AppTableTh>
                  </AppTableThead>
                  <AppTableBody>
                    {requests.map((r) => (
                      <AppTableTr key={r.id}>
                        <AppTableTd>{idCardRequestTitle(r)}</AppTableTd>
                        <AppTableTd>{statusChip(r.status)}</AppTableTd>
                        <AppTableTd>{r.createdAt?.slice(0, 10) || r.requestedAt?.slice(0, 10) || '—'}</AppTableTd>
                        <AppTableTd>{r.notes || '—'}</AppTableTd>
                        <AppTableTd>
                          <button
                            type="button"
                            onClick={() => openRequestPreview(r)}
                            className="text-xs font-bold text-[#134e4a] hover:underline"
                          >
                            Preview
                          </button>
                        </AppTableTd>
                      </AppTableTr>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            </div>
          </>
        ) : null}
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
