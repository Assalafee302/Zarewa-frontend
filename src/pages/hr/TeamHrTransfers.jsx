import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrTransferRecommendation, fetchHrTransferRecommendations } from '../../lib/hrExtended';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
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

export default function TeamHrTransfers() {
  const ws = useWorkspace();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [recs, setRecs] = useState([]);
  const [userId, setUserId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [formErr, setFormErr] = useState('');
  const [message, setMessage] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrTransferRecommendations();
    if (!ok || !data?.ok) {
      setRecs([]);
      return { error: data?.error || 'Could not load recommendations.', hasData: false };
    }
    setRecs(data.recommendations || []);
    return { hasData: true };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    const { ok, data } = await createHrTransferRecommendation({
      userId,
      toBranchId,
      reason: reason.trim(),
    });
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not submit.');
      return;
    }
    setMessage('Transfer recommendation submitted for HQ review.');
    setReason('');
    setUserId('');
    setToBranchId('');
    setModalOpen(false);
    await reload();
  };

  const branchName = (id) => branches.find((b) => b.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Recommend a branch transfer for HQ HR approval. Approved recommendations update the staff profile and branch
          history.
        </p>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Recommend transfer</HrAddFormButton>
      </div>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Recommend branch transfer" size="md">
        <form onSubmit={submit} className="space-y-3">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Staff
              <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To branch
              <select className={HR_FIELD_CLASS} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required>
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-600 block">
            Reason
            <textarea className={HR_FIELD_CLASS} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
          <button type="submit" className={HR_BTN_PRIMARY}>
            Submit recommendation
          </button>
        </form>
      </HrFormModal>

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>From → To</AppTableTh>
              <AppTableTh>Status</AppTableTh>
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {recs.map((r) => (
              <AppTableTr key={r.id}>
                <AppTableTd>{r.staffDisplayName}</AppTableTd>
                <AppTableTd>
                  {branchName(r.fromBranchId)} → {branchName(r.toBranchId)}
                </AppTableTd>
                <AppTableTd>{r.status}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
