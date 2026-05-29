import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrTransfers } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import {
  fetchHrBranchTransfers,
  formToProfilePatch,
  staffToForm,
  updateHrStaffProfile,
} from '../../lib/hrStaff';
import { fetchHrTransferRecommendations, reviewHrTransferRecommendation } from '../../lib/hrExtended';
import { emptyStaffForm } from '../../lib/hrStaffConstants';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function HrTransfers() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canManage = canManageHrTransfers(perms);

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const branchName = useMemo(() => {
    const m = {};
    for (const b of branches) m[b.id] = b.name;
    return m;
  }, [branches]);

  const [staff, setStaff] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transferForm, setTransferForm] = useState(() => emptyStaffForm());
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');
  const [transferErr, setTransferErr] = useState('');

  const { loading: staffLoading } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { error: data?.error || 'Could not load staff.', hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload: reloadTransfers } = useHrListLoad(async () => {
    const [tr, rec] = await Promise.all([fetchHrBranchTransfers(), fetchHrTransferRecommendations()]);
    if (!tr.ok || !tr.data?.ok) {
      setTransfers([]);
      return { error: tr.data?.error || 'Could not load transfers.', hasData: false };
    }
    setTransfers(tr.data.transfers || []);
    if (rec.ok && rec.data?.ok) setRecommendations(rec.data.recommendations || []);
    return { hasData: true };
  }, []);

  const reviewRec = async (id, status) => {
    const { ok, data } = await reviewHrTransferRecommendation(id, { status });
    if (ok && data?.ok) await reloadTransfers();
  };

  const selectedStaff = staff.find((s) => s.userId === selectedUserId);

  const onSelectStaff = (userId) => {
    setSelectedUserId(userId);
    const s = staff.find((x) => x.userId === userId);
    if (s) {
      const f = staffToForm(s);
      setTransferForm({ ...f, branchChangeReason: '' });
    }
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !canManage) return;
    const orig = selectedStaff.branchId || selectedStaff.normalized?.branchId || '';
    if (String(transferForm.branchId) === String(orig)) {
      setTransferErr('Choose a different branch to record a transfer.');
      return;
    }
    if (!String(transferForm.branchChangeReason || '').trim()) {
      setTransferErr('Transfer reason is required.');
      return;
    }
    setTransferBusy(true);
    setTransferErr('');
    setTransferMsg('');
    const patch = formToProfilePatch(transferForm, { originalBranchId: orig });
    const { ok, data } = await updateHrStaffProfile(selectedUserId, {
      branchId: patch.branchId,
      branchChangeReason: patch.branchChangeReason,
    });
    setTransferBusy(false);
    if (!ok || !data?.ok) {
      setTransferErr(data?.error || 'Transfer failed.');
      return;
    }
    setTransferMsg('Branch transfer recorded.');
    await reloadTransfers();
    const staffRes = await apiFetch('/api/hr/staff');
    if (staffRes.ok && staffRes.data?.ok) setStaff(staffRes.data.staff || []);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Branch moves are stored in each employee&apos;s transfer history when HR changes their branch on file.
      </p>

      {canManage ? (
        <form
          onSubmit={submitTransfer}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Record transfer</h3>
          {transferErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{transferErr}</div>
          ) : null}
          {transferMsg ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {transferMsg}
            </div>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Employee
            <select
              className="mt-1 block w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedUserId}
              onChange={(e) => onSelectStaff(e.target.value)}
              required
              disabled={staffLoading}
            >
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.displayName || s.username}
                  {s.employeeNo ? ` · ${s.employeeNo}` : ''} · {branchName[s.branchId] || s.branchId}
                </option>
              ))}
            </select>
          </label>
          {selectedStaff ? (
            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <label className="block text-xs font-semibold text-slate-600">
                New branch
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={transferForm.branchId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, branchId: e.target.value }))}
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Reason
                <input
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={transferForm.branchChangeReason}
                  onChange={(e) => setTransferForm((f) => ({ ...f, branchChangeReason: e.target.value }))}
                  placeholder="Why is this transfer happening?"
                  required
                />
              </label>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={transferBusy || !selectedUserId}
            className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {transferBusy ? 'Saving…' : 'Record transfer'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-600">You can view transfer history but need HR transfer permission to record moves.</p>
      )}

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {loading && transfers.length === 0 ? <p className="text-sm text-slate-600">Loading transfers…</p> : null}

      {transfers.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Employee</AppTableTh>
              <AppTableTh>From</AppTableTh>
              <AppTableTh>To</AppTableTh>
              <AppTableTh>Effective</AppTableTh>
              <AppTableTh>Reason</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {transfers.map((t) => (
                <AppTableTr key={t.id}>
                  <AppTableTd>
                    <Link
                      to={`/hr/staff/${encodeURIComponent(t.userId)}`}
                      className="font-semibold text-[#134e4a] hover:underline"
                    >
                      {t.staffDisplayName || t.staffUsername}
                    </Link>
                    {t.employeeNo ? <span className="block text-xs text-slate-500">{t.employeeNo}</span> : null}
                  </AppTableTd>
                  <AppTableTd>{branchName[t.fromBranchId] || t.fromBranchId || '—'}</AppTableTd>
                  <AppTableTd>{branchName[t.toBranchId] || t.toBranchId || '—'}</AppTableTd>
                  <AppTableTd>{t.effectiveFromIso || '—'}</AppTableTd>
                  <AppTableTd title={t.reason}>{t.reason || '—'}</AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : !loading ? (
        <p className="text-sm text-slate-600">No branch transfers recorded yet.</p>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Branch manager recommendations</h3>
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTr>
                  <AppTableTh>Staff</AppTableTh>
                  <AppTableTh>Route</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  {canManage ? <AppTableTh /> : null}
                </AppTableTr>
              </AppTableThead>
              <AppTableBody>
                {recommendations.map((r) => (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{r.staffDisplayName}</AppTableTd>
                    <AppTableTd>
                      {branchName[r.fromBranchId] || r.fromBranchId} → {branchName[r.toBranchId] || r.toBranchId}
                    </AppTableTd>
                    <AppTableTd>{r.status}</AppTableTd>
                    {canManage && r.status === 'pending' ? (
                      <AppTableTd className="space-x-2">
                        <button type="button" className="text-xs font-bold text-emerald-700" onClick={() => reviewRec(r.id, 'approved')}>
                          Approve
                        </button>
                        <button type="button" className="text-xs font-bold text-red-700" onClick={() => reviewRec(r.id, 'rejected')}>
                          Reject
                        </button>
                      </AppTableTd>
                    ) : canManage ? (
                      <AppTableTd />
                    ) : null}
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </div>
      ) : null}
    </div>
  );
}
