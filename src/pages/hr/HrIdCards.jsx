import { HrButton, HrAddButton, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import React, { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrIdCardApplyFields } from '../../components/hr/HrIdCardApplyFields';
import { IdCardPreview } from '../../components/hr/IdCardPreview';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { createHrIdCardRequest, fetchHrIdCards, patchHrIdCardRequest } from '../../lib/hrIdCards';
import { canManageHrStaff } from '../../lib/hrAccess';
import {
  blankIdCardApplyForm,
  bloodGroupFromStaff,
  emergencyContactFromStaff,
  idCardApplyPayload,
  validateIdCardApplyForm,
} from '../../lib/hrIdCardForm';

const STATUS_STEPS = ['pending', 'processing', 'printed', 'ready', 'collected', 'reissued', 'expired'];

function TempIdCardModal({ request, staff, onClose }) {
  const person = staff?.find((s) => s.userId === request?.userId) || request;
  return <IdCardPreview request={request} person={person} onClose={onClose} temporary />;
}

export default function HrIdCards() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const isManager = canManageHrStaff(ws?.permissions);
  const currentUserId = ws?.userId;

  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [applyModal, setApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState(blankIdCardApplyForm);
  const [applyTargetUserId, setApplyTargetUserId] = useState('');
  const [applyErr, setApplyErr] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  const [tempCardModal, setTempCardModal] = useState(false);
  const [tempCardRequest, setTempCardRequest] = useState(null);
  const [previewRequest, setPreviewRequest] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = isManager ? await fetchHrIdCards() : await fetchHrIdCards(currentUserId);
      setRequests(data);
    } catch {
      setError('Could not load ID card requests.');
    } finally {
      setLoading(false);
    }
  }, [isManager, currentUserId]);

  useEffect(() => {
    load();
    // Load staff list for manager view
    if (isManager) {
      apiFetch('/api/hr/staff').then(({ ok, data }) => {
        if (ok && data?.ok) setStaff(data.staff || []);
      });
    }
  }, [load, isManager]);

  const updateStatus = async (id, status) => {
    try {
      await patchHrIdCardRequest(id, { status });
      await load();
    } catch {
      showToast('Status update failed.', { variant: 'error' });
    }
  };

  const resetApplyModal = () => {
    setApplyForm(blankIdCardApplyForm());
    setApplyTargetUserId(isManager ? '' : currentUserId || '');
    setApplyErr('');
    setApplyMsg('');
  };

  const onApplyTargetChange = (nextUserId) => {
    setApplyTargetUserId(nextUserId);
    const person = staff.find((s) => s.userId === nextUserId);
    if (!person) return;
    setApplyForm((f) => ({
      ...f,
      bloodGroup: bloodGroupFromStaff(person),
      emergencyContact: emergencyContactFromStaff(person),
    }));
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setApplyErr('');
    const targetUserId = isManager ? applyTargetUserId : currentUserId;
    if (!targetUserId) {
      setApplyErr('Select an employee for this ID card request.');
      return;
    }
    const validation = validateIdCardApplyForm(applyForm);
    if (!validation.ok) {
      setApplyErr(validation.error);
      return;
    }
    setApplyBusy(true);
    try {
      const { ok, data } = await createHrIdCardRequest(idCardApplyPayload(applyForm, targetUserId));
      if (!ok || !data?.ok) {
        setApplyErr(data?.error || 'Submission failed.');
        return;
      }
      setApplyMsg('Your request has been submitted.');
      setApplyForm(blankIdCardApplyForm());
      setApplyModal(false);
      await load();
    } catch {
      setApplyErr('Submission failed. Please try again.');
    } finally {
      setApplyBusy(false);
    }
  };

  const openPreview = (req) => {
    const person = staff.find((s) => s.userId === req.userId) || req;
    setPreviewRequest({ ...req, person });
  };

  const markPrinted = async (id) => {
    try {
      await patchHrIdCardRequest(id, { printed: true, status: 'ready' });
      await load();
    } catch {
      showToast('Could not mark as printed.', { variant: 'error' });
    }
  };

  const openTempCard = (req) => {
    setTempCardRequest(req);
    setTempCardModal(true);
  };

  // Stats for manager view
  const statCounts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    processing: requests.filter((r) => r.status === 'processing').length,
    ready: requests.filter((r) => r.status === 'ready').length,
    total: requests.length,
  };

  return (
    <div className="space-y-5">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <p className="text-sm text-slate-600 max-w-2xl">
          {isManager
            ? 'Manage staff ID card requests. Update status as cards are processed and issue temporary cards where needed.'
            : 'Apply for a new or replacement ID card. Track your request status here.'}
        </p>
        <HrAddFormButton onClick={() => { resetApplyModal(); setApplyModal(true); }}>
          Apply for ID Card
        </HrAddFormButton>
      </div>

      {applyMsg && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{applyMsg}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {/* Stats row — manager only */}
      {isManager && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 no-print">
          {[
            { label: 'Pending', value: statCounts.pending, color: 'border-amber-200 bg-amber-50 text-amber-800' },
            { label: 'Processing', value: statCounts.processing, color: 'border-sky-200 bg-sky-50 text-sky-800' },
            { label: 'Ready for Collection', value: statCounts.ready, color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            { label: 'Total this year', value: statCounts.total, color: 'border-slate-200 bg-white text-slate-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff Name</AppTableTh>
                <AppTableTh>Request Type</AppTableTh>
                <AppTableTh>Reason</AppTableTh>
                <AppTableTh>Requested Date</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                {isManager && <AppTableTh className="no-print">Actions</AppTableTh>}
            </AppTableThead>
            <AppTableBody>
              {!requests.length && (
                <AppTableTr>
                  <AppTableTd colSpan={6}><span className="text-slate-500">No ID card requests found.</span></AppTableTd>
                </AppTableTr>
              )}
              {requests.map((r) => {
                const person = staff.find((s) => s.userId === r.userId);
                const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(r.status) + 1];
                return (
                  <AppTableTr key={r.id}>
                    <AppTableTd className="font-semibold">{person?.displayName || r.userId}</AppTableTd>
                    <AppTableTd className="capitalize">{r.requestType || 'new'}</AppTableTd>
                    <AppTableTd>{r.reason || r.notes || '—'}</AppTableTd>
                    <AppTableTd>{r.createdAt?.slice(0, 10) || r.requestedAt?.slice(0, 10) || '—'}</AppTableTd>
                    <AppTableTd>
                      <div className="flex flex-wrap items-center gap-2">
                        <HrStatusBadge status={r.status} variant="idCard" />
                        {!isManager ? (
                          <button type="button" className="text-ui-xs font-bold text-zarewa-teal hover:underline" onClick={() => openPreview(r)}>
                            Preview
                          </button>
                        ) : null}
                      </div>
                    </AppTableTd>
                    {isManager && (
                      <AppTableTd className="no-print">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs font-bold text-zarewa-teal hover:underline"
                            onClick={() => openPreview(r)}
                          >
                            Preview
                          </button>
                          {nextStatus && (
                            <button
                              type="button"
                              className="text-xs font-bold text-zarewa-teal hover:underline"
                              onClick={() => updateStatus(r.id, nextStatus)}
                            >
                              Mark {nextStatus}
                            </button>
                          )}
                          {r.status === 'processing' && (
                            <button
                              type="button"
                              className="text-xs font-bold text-sky-800 hover:underline"
                              onClick={() => markPrinted(r.id)}
                            >
                              Mark printed
                            </button>
                          )}
                          {r.status !== 'collected' && (
                            <button
                              type="button"
                              className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200"
                              onClick={() => openTempCard(r)}
                            >
                              Temp card
                            </button>
                          )}
                        </div>
                      </AppTableTd>
                    )}
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      {/* Apply modal */}
      <HrFormModal isOpen={applyModal} onClose={() => setApplyModal(false)} title="Apply for ID Card" size="md">
        <form onSubmit={submitApplication} className="space-y-4">
          <p className="text-xs text-slate-500">Submit a request for a new or replacement staff ID card. HR will review and issue after verification.</p>
          {applyErr && <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{applyErr}</div>}
          <HrIdCardApplyFields
            form={applyForm}
            setForm={setApplyForm}
            showStaffSelect={isManager}
            staffOptions={staff}
            targetUserId={applyTargetUserId}
            onTargetUserIdChange={onApplyTargetChange}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setApplyModal(false)} className={HR_BTN_SECONDARY}>Cancel</button>
            <HrButton type="submit" disabled={applyBusy} >
              {applyBusy ? 'Submitting…' : 'Submit request'}
            </HrButton>
          </div>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={Boolean(previewRequest)} onClose={() => setPreviewRequest(null)} title="ID card preview" size="sm">
        {previewRequest ? (
          <IdCardPreview request={previewRequest} person={previewRequest.person} onClose={() => setPreviewRequest(null)} />
        ) : null}
      </HrFormModal>

      {/* Temp ID card modal */}
      <HrFormModal isOpen={tempCardModal} onClose={() => setTempCardModal(false)} title="Temporary ID Card" size="sm">
        <TempIdCardModal request={tempCardRequest} staff={staff} onClose={() => setTempCardModal(false)} />
      </HrFormModal>
    </div>
  );
}
