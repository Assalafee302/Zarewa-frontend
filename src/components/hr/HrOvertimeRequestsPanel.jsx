import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  approveHrOvertimeRequest,
  branchReviewHrOvertimeRequest,
  createHrOvertimeRequest,
  fetchHrOvertimeRequests,
  rejectHrOvertimeRequest,
  submitHrOvertimeRequest,
} from '../../lib/hrPhase2';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState, HrStatusPill } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../ui/AppDataTable';

export function HrOvertimeRequestsPanel({ branchScoped = false } = {}) {
  const ws = useWorkspace();
  const perms = ws?.session?.permissions || [];
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [fromIso, setFromIso] = useState('');
  const [toIso, setToIso] = useState('');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ userId: '', workDateIso: '', startTime: '08:00', endTime: '18:00', reason: '', submit: true });
  const [note, setNote] = useState('');

  const canRequest = hrHasPermission(perms, 'hr.overtime.request');
  const canReview = hrHasPermission(perms, 'hr.overtime.review');
  const canApprove = hrHasPermission(perms, 'hr.overtime.approve');

  const { loading, error, setError, reload } = useHrListLoad(async () => {
    const [otRes, staffRes] = await Promise.all([
      fetchHrOvertimeRequests({ status, fromIso, toIso }),
      canRequest ? apiFetch('/api/hr/staff') : Promise.resolve({ ok: true, data: { staff: [] } }),
    ]);
    if (staffRes.ok && staffRes.data?.ok) {
      let list = staffRes.data.staff || [];
      if (branchScoped) list = list.filter((s) => s.branchId === ws?.session?.workspaceBranchId);
      setStaff(list.filter((s) => s.status === 'active'));
    }
    if (!otRes.ok || !otRes.data?.ok) {
      setRequests([]);
      return { error: otRes.data?.error || 'Could not load overtime requests.', hasData: false };
    }
    setRequests(otRes.data.requests || []);
    return { hasData: true };
  }, [status, fromIso, toIso, branchScoped, canRequest]);

  const saveRequest = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await createHrOvertimeRequest(form);
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Could not create request.'); return; }
    if (data.warning) setError(data.warning);
    setModal('');
    await reload();
  };

  const exportCsv = () => {
    window.open('/api/hr/reports/export/overtime', '_blank');
  };

  return (
    <HrCard
      title="Overtime requests"
      actions={canRequest ? <HrAddFormButton onClick={() => setModal('new')}>New request</HrAddFormButton> : null}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={HR_FIELD_CLASS} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'submitted', 'branch_review', 'hr_review', 'approved', 'rejected', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input type="date" className={HR_FIELD_CLASS} value={fromIso} onChange={(e) => setFromIso(e.target.value)} />
        <input type="date" className={HR_FIELD_CLASS} value={toIso} onChange={(e) => setToIso(e.target.value)} />
        <button type="button" className={HR_BTN_SECONDARY} onClick={exportCsv}>Export CSV</button>
      </div>
      {error ? <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</div> : null}
      {loading && !requests.length ? <p className="text-sm text-slate-600">Loading…</p> : requests.length === 0 ? (
        <HrEmptyState title="No overtime requests for this filter." />
      ) : (
        <AppTableWrap className="overflow-x-auto">
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Date</AppTableTh>
                <AppTableTh>Hours</AppTableTh>
                <AppTableTh>OT hours</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh />
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {requests.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd>{r.displayName}</AppTableTd>
                  <AppTableTd>{r.workDateIso}</AppTableTd>
                  <AppTableTd>{r.calculatedHours}</AppTableTd>
                  <AppTableTd>{r.eligibleOvertimeHours}{r.specialSundayOvertime ? ' (Sun)' : ''}</AppTableTd>
                  <AppTableTd><HrStatusPill status={r.status} /></AppTableTd>
                  <AppTableTd>
                    <div className="flex flex-wrap gap-1">
                      {canRequest && r.status === 'draft' ? (
                        <button type="button" className="text-[10px] font-bold uppercase text-[#134e4a]" onClick={async () => { await submitHrOvertimeRequest(r.id); reload(); }}>Submit</button>
                      ) : null}
                      {canReview && r.status === 'submitted' ? (
                        <button type="button" className="text-[10px] font-bold uppercase text-[#134e4a]" onClick={() => { setSelected(r); setModal('branch'); }}>Branch review</button>
                      ) : null}
                      {canApprove && ['hr_review', 'branch_review'].includes(r.status) ? (
                        <button type="button" className="text-[10px] font-bold uppercase text-emerald-700" onClick={() => { setSelected(r); setModal('approve'); }}>Approve</button>
                      ) : null}
                      {canApprove && !['approved', 'rejected', 'cancelled'].includes(r.status) ? (
                        <button type="button" className="text-[10px] font-bold uppercase text-red-700" onClick={() => { setSelected(r); setModal('reject'); }}>Reject</button>
                      ) : null}
                    </div>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      <HrFormModal isOpen={modal === 'new'} onClose={() => setModal('')} title="New overtime request">
        <form className="space-y-3" onSubmit={saveRequest}>
          <select className={HR_FIELD_CLASS} required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
            <option value="">Staff…</option>
            {staff.map((s) => <option key={s.userId} value={s.userId}>{s.displayName}</option>)}
          </select>
          <input type="date" className={HR_FIELD_CLASS} required value={form.workDateIso} onChange={(e) => setForm((f) => ({ ...f, workDateIso: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" className={HR_FIELD_CLASS} required value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            <input type="time" className={HR_FIELD_CLASS} required value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
          <textarea className={HR_FIELD_CLASS} rows={2} placeholder="Reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          <p className="text-xs text-slate-500">Weekday OT after 9 hrs; Saturday after 7 hrs. Sunday requires MD/HR approval.</p>
          <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>Save & submit</button>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={modal === 'branch'} onClose={() => setModal('')} title="Branch review">
        {selected ? (
          <div className="space-y-3">
            <textarea className={HR_FIELD_CLASS} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
            <div className="flex gap-2 justify-end">
              <button type="button" className={HR_BTN_SECONDARY} disabled={busy} onClick={async () => { setBusy(true); await branchReviewHrOvertimeRequest(selected.id, { approve: false, rejectionReason: note }); setBusy(false); setModal(''); reload(); }}>Reject</button>
              <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={async () => { setBusy(true); await branchReviewHrOvertimeRequest(selected.id, { approve: true, note }); setBusy(false); setModal(''); reload(); }}>Endorse</button>
            </div>
          </div>
        ) : null}
      </HrFormModal>

      <HrFormModal isOpen={modal === 'approve'} onClose={() => setModal('')} title="Approve overtime">
        {selected ? (
          <div className="space-y-3">
            <textarea className={HR_FIELD_CLASS} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Approval note" />
            <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={async () => { setBusy(true); await approveHrOvertimeRequest(selected.id, { approvalNote: note }); setBusy(false); setModal(''); reload(); }}>Approve</button>
          </div>
        ) : null}
      </HrFormModal>

      <HrFormModal isOpen={modal === 'reject'} onClose={() => setModal('')} title="Reject overtime">
        {selected ? (
          <div className="space-y-3">
            <textarea className={HR_FIELD_CLASS} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rejection reason" />
            <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={async () => { setBusy(true); await rejectHrOvertimeRequest(selected.id, { rejectionReason: note }); setBusy(false); setModal(''); reload(); }}>Reject</button>
          </div>
        ) : null}
      </HrFormModal>
    </HrCard>
  );
}
