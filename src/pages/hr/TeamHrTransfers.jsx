import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrTransferRequest, fetchHrTransferRequests, patchHrTransferRequest } from '../../lib/hrTransfers';
import HrTransferStageBar from '../../components/hr/HrTransferStageBar';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function TeamHrTransfers() {
  const ws = useWorkspace();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('transferId') || '';
  const [modalOpen, setModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [userId, setUserId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDateIso, setEffectiveDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [formErr, setFormErr] = useState('');
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrTransferRequests({ status: 'branch_review' });
    if (!ok || !data?.ok) {
      setTransfers([]);
      return { error: data?.error || 'Could not load transfers.', hasData: false };
    }
    setTransfers(data.transfers || []);
    return { hasData: true };
  }, []);

  useEffect(() => {
    if (focusId && transfers.length) {
      const match = transfers.find((t) => t.id === focusId);
      if (match) setDetail(match);
    }
  }, [focusId, transfers]);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || id;
  const selectedStaff = useMemo(() => staff.find((s) => s.userId === userId), [staff, userId]);

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    setBusy(true);
    const { ok, data } = await createHrTransferRequest({
      userId,
      transferType: 'inter_branch',
      toBranchId,
      reason: reason.trim(),
      effectiveDateIso,
      fromBranchId: selectedStaff?.branchId,
      fromDepartment: selectedStaff?.department,
      submit: true,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not submit.');
      return;
    }
    setMessage('Transfer submitted — HQ HR will review after branch endorsement.');
    setReason('');
    setUserId('');
    setToBranchId('');
    setModalOpen(false);
    await reload();
  };

  const endorse = async (id) => {
    setBusy(true);
    const { ok, data } = await patchHrTransferRequest(id, { action: 'hr_review', note: 'Branch endorsed' });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Endorsement failed.');
      return;
    }
    setMessage('Transfer endorsed and sent to HR.');
    setDetail(null);
    await reload();
  };

  return (
    <HrPageBody>
      <HrPageIntro
        title="Transfer endorsements"
        description="Recommend inter-branch moves or endorse transfers awaiting branch review. HQ HR and GM complete approval after your endorsement."
        actions={<HrAddFormButton onClick={() => setModalOpen(true)}>Recommend transfer</HrAddFormButton>}
      />

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
      {formErr ? <ProfileInlineAlert variant="error">{formErr}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Branch review queue" subtitle="Endorse to send to HQ HR">
        {loading && !transfers.length ? <p className="text-sm text-slate-600">Loading…</p> : null}
        {!loading && !transfers.length ? (
          <p className="text-sm text-slate-500">No transfers awaiting branch review.</p>
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTr>
                  <AppTableTh>Staff</AppTableTh>
                  <AppTableTh>Route</AppTableTh>
                  <AppTableTh>Effective</AppTableTh>
                  <AppTableTh />
                </AppTableTr>
              </AppTableThead>
              <AppTableBody>
                {transfers.map((t) => (
                  <AppTableTr key={t.id}>
                    <AppTableTd>{t.staffDisplayName}</AppTableTd>
                    <AppTableTd>
                      {branchName(t.fromBranchId)} → {branchName(t.toBranchId)}
                    </AppTableTd>
                    <AppTableTd>{t.effectiveDateIso || '—'}</AppTableTd>
                    <AppTableTd>
                      <button type="button" className="text-[10px] font-bold uppercase text-[#134e4a] mr-2" onClick={() => setDetail(t)}>
                        Details
                      </button>
                      <button type="button" disabled={busy} className="text-[10px] font-bold uppercase text-emerald-700" onClick={() => endorse(t.id)}>
                        Endorse
                      </button>
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </ProfileOverviewSection>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Recommend branch transfer" size="md">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileFormField label="Staff" htmlFor="transfer-staff">
              <select id="transfer-staff" className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="To branch" htmlFor="transfer-branch">
              <select id="transfer-branch" className={HR_FIELD_CLASS} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required>
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.id}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="Effective date" htmlFor="transfer-effective">
              <input id="transfer-effective" type="date" className={HR_FIELD_CLASS} value={effectiveDateIso} onChange={(e) => setEffectiveDateIso(e.target.value)} required />
            </ProfileFormField>
          </div>
          <ProfileFormField label="Reason" htmlFor="transfer-reason">
            <textarea id="transfer-reason" className={HR_FIELD_CLASS} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </ProfileFormField>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            Submit transfer
          </button>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title="Transfer details" size="md">
        {detail ? (
          <div className="space-y-3 text-sm">
            <HrTransferStageBar transferType={detail.transferType} status={detail.status} />
            <p><strong>{detail.staffDisplayName}</strong></p>
            <p>{branchName(detail.fromBranchId)} → {branchName(detail.toBranchId)}</p>
            <p className="text-slate-600">{detail.reason}</p>
            <button type="button" disabled={busy} className={HR_BTN_PRIMARY} onClick={() => endorse(detail.id)}>
              Endorse → HR
            </button>
            <button type="button" className={HR_BTN_SECONDARY} onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        ) : null}
      </HrFormModal>
    </HrPageBody>
  );
}
