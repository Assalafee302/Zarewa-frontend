import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrTransferRecommendation, fetchHrTransferRecommendations } from '../../lib/hrExtended';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

export default function TeamHrTransfers() {
  const ws = useWorkspace();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const [staff, setStaff] = useState([]);
  const [recs, setRecs] = useState([]);
  const [userId, setUserId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
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
    const { ok, data } = await createHrTransferRecommendation({
      userId,
      toBranchId,
      reason: reason.trim(),
    });
    if (!ok || !data?.ok) {
      setMessage(data?.error || 'Could not submit.');
      return;
    }
    setMessage('Transfer recommendation submitted for HQ review.');
    setReason('');
    await reload();
  };

  const branchName = (id) => branches.find((b) => b.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Recommend a branch transfer for HQ HR approval. Approved recommendations update the staff profile and branch
        history.
      </p>
      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Staff
            <select className={fieldCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
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
            <select className={fieldCls} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required>
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
          <textarea className={fieldCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <button type="submit" className="rounded-xl bg-[#134e4a] px-4 py-2 text-sm font-bold text-white">
          Submit recommendation
        </button>
      </form>
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
