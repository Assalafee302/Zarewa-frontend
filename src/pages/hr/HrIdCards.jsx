import React, { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { createHrIdCardRequest, fetchHrIdCards, patchHrIdCardRequest } from '../../lib/hrIdCards';
import { canManageHrStaff } from '../../lib/hrAccess';
import { HR_BLOOD_GROUPS } from '../../lib/hrStaffFormMeta';

const STATUS_STEPS = ['pending', 'processing', 'printed', 'ready', 'collected', 'reissued', 'expired'];

const STATUS_PILL = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  processing: 'bg-sky-50 text-sky-800 border-sky-200',
  printed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  ready: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  collected: 'bg-slate-100 text-slate-600 border-slate-200',
  reissued: 'bg-violet-50 text-violet-900 border-violet-200',
  expired: 'bg-red-50 text-red-800 border-red-200',
};

const BLANK_APPLY = { requestType: 'new', reason: '', notes: '', bloodGroup: '', emergencyContact: '', lostDamaged: false };

function IdCardPreview({ request, person, onClose, onPrint, temporary = false }) {
  const [fallbackExpiryDate, setFallbackExpiryDate] = useState('');
  useEffect(() => {
    setFallbackExpiryDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }, []);
  const showPhoto = person?.avatarUrl && (person.avatarUrl.startsWith('https://') || person.avatarUrl.startsWith('data:image/'));
  const issueDate = request.issueDateIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const expiryDate = request.expiryDateIso?.slice(0, 10) || fallbackExpiryDate;
  const verifyCode = request.id?.slice(-8).toUpperCase() || 'VERIFY';

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body > *:not(#id-card-print-root) { display: none !important; }
          #id-card-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="id-card-print-root" className="flex flex-col items-center gap-4">
        <div className="relative w-80 rounded-2xl border-2 border-[#134e4a] bg-white p-6 shadow-xl overflow-hidden">
          {temporary ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]">
              <span className="-rotate-12 text-2xl font-black uppercase tracking-widest text-[#134e4a]">Temporary</span>
            </div>
          ) : null}
          <div className="relative text-center space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-[#134e4a]">Zarewa Aluminium & Plastics Ltd</div>
            {temporary ? (
              <div className="inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-900">
                Temporary Staff ID
              </div>
            ) : (
              <div className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                Staff identification
              </div>
            )}
            {showPhoto ? (
              <img src={person.avatarUrl} alt="" className="mx-auto h-20 w-20 rounded-full border-2 border-slate-200 object-cover" />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-xs text-slate-400">
                Photo
              </div>
            )}
            <div>
              <p className="font-black text-[#134e4a] text-base">{person?.displayName || request.displayName || '—'}</p>
              <p className="text-xs text-slate-500">{person?.employeeNo || request.employeeNo || '—'}</p>
              <p className="text-xs text-slate-600 mt-1">{person?.jobTitle || request.jobTitle || '—'}</p>
              <p className="text-xs text-slate-600">{person?.department || request.department || '—'}</p>
              <p className="text-xs text-slate-500">{person?.branchId || request.branchId || '—'}</p>
            </div>
            {(request.bloodGroup || request.emergencyContact) && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-left text-[10px] text-slate-600 space-y-1">
                {request.bloodGroup ? <p><span className="font-bold">Blood group:</span> {request.bloodGroup}</p> : null}
                {request.emergencyContact ? <p><span className="font-bold">Emergency:</span> {request.emergencyContact}</p> : null}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1">
                <p className="font-bold text-slate-400 uppercase">Issued</p>
                <p className="font-semibold text-slate-700">{issueDate}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1">
                <p className="font-bold text-slate-400 uppercase">Expires</p>
                <p className="font-semibold text-slate-700">{expiryDate}</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[9px] font-mono text-slate-500">
              Verification: {verifyCode}
            </div>
            <div className="border-t border-slate-100 pt-2 text-[9px] text-slate-400">
              Authorised signature: ___________________
            </div>
            <p className="text-[9px] text-slate-400">Property of Zarewa Group. If found, please return to HR.</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end no-print">
        <button type="button" onClick={onClose} className={HR_BTN_SECONDARY}>Close</button>
        <button type="button" onClick={onPrint || (() => window.print())} className={HR_BTN_PRIMARY}>Print card</button>
      </div>
    </div>
  );
}

function TempIdCardModal({ request, staff, onClose }) {
  const person = staff?.find((s) => s.userId === request?.userId) || request;
  return <IdCardPreview request={request} person={person} onClose={onClose} temporary />;
}

export default function HrIdCards() {
  const ws = useWorkspace();
  const isManager = canManageHrStaff(ws?.permissions);
  const currentUserId = ws?.userId;

  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [applyModal, setApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState(BLANK_APPLY);
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
      alert('Status update failed.');
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setApplyErr('');
    setApplyBusy(true);
    try {
      const { ok, data } = await createHrIdCardRequest({
        ...applyForm,
        userId: currentUserId,
      });
      if (!ok || !data?.ok) {
        setApplyErr(data?.error || 'Submission failed.');
        return;
      }
      setApplyMsg('Your request has been submitted.');
      setApplyForm(BLANK_APPLY);
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
      alert('Could not mark as printed.');
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
        <HrAddFormButton onClick={() => { setApplyForm(BLANK_APPLY); setApplyErr(''); setApplyMsg(''); setApplyModal(true); }}>
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
              <AppTableTr>
                <AppTableTh>Staff Name</AppTableTh>
                <AppTableTh>Request Type</AppTableTh>
                <AppTableTh>Reason</AppTableTh>
                <AppTableTh>Requested Date</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                {isManager && <AppTableTh className="no-print">Actions</AppTableTh>}
              </AppTableTr>
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
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[r.status] || STATUS_PILL.pending}`}>
                          {r.status}
                        </span>
                        {!isManager ? (
                          <button type="button" className="text-[10px] font-bold text-[#134e4a] hover:underline" onClick={() => openPreview(r)}>
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
                            className="text-xs font-bold text-[#134e4a] hover:underline"
                            onClick={() => openPreview(r)}
                          >
                            Preview
                          </button>
                          {nextStatus && (
                            <button
                              type="button"
                              className="text-xs font-bold text-[#134e4a] hover:underline"
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
                              className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
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
          <label className="text-xs font-semibold text-slate-600 block">
            Request type
            <select className={HR_FIELD_CLASS} value={applyForm.requestType} onChange={(e) => setApplyForm({ ...applyForm, requestType: e.target.value })}>
              <option value="new">New ID card</option>
              <option value="replacement">Replacement</option>
              <option value="temporary">Temporary only</option>
            </select>
          </label>
          {applyForm.requestType === 'replacement' && (
            <>
              <label className="text-xs font-semibold text-slate-600 block">
                Reason for replacement
                <select
                  className={HR_FIELD_CLASS}
                  value={applyForm.reason}
                  onChange={(e) =>
                    setApplyForm({
                      ...applyForm,
                      reason: e.target.value,
                      lostDamaged: e.target.value === 'Lost' || e.target.value === 'Damaged',
                    })
                  }
                >
                  <option value="">Select…</option>
                  <option value="Lost">Lost</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Expired">Expired</option>
                </select>
              </label>
            </>
          )}
          <label className="text-xs font-semibold text-slate-600 block">
            Blood group (optional)
            <select className={HR_FIELD_CLASS} value={applyForm.bloodGroup} onChange={(e) => setApplyForm({ ...applyForm, bloodGroup: e.target.value })}>
              {HR_BLOOD_GROUPS.map((b) => (
                <option key={b.value || 'none'} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 block">
            Emergency contact (optional)
            <input
              className={HR_FIELD_CLASS}
              value={applyForm.emergencyContact}
              onChange={(e) => setApplyForm({ ...applyForm, emergencyContact: e.target.value })}
              placeholder="Name and phone"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 block">
            Notes
            <textarea
              className={HR_FIELD_CLASS}
              rows={3}
              value={applyForm.notes}
              onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })}
              placeholder="Any additional information…"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setApplyModal(false)} className={HR_BTN_SECONDARY}>Cancel</button>
            <button type="submit" disabled={applyBusy} className={HR_BTN_PRIMARY}>
              {applyBusy ? 'Submitting…' : 'Submit request'}
            </button>
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
