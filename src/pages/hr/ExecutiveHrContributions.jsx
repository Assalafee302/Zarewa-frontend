import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canMarkBranchContribution } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function ExecutiveHrContributions() {
  const ws = useWorkspace();
  const canEdit = canMarkBranchContribution(ws?.permissions);
  const [periodYyyymm, setPeriodYyyymm] = useState(currentPeriodYyyymm());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBranch, setBusyBranch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch(
      `/api/hr/branch-contributions?periodYyyymm=${encodeURIComponent(periodYyyymm)}`
    );
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load contributions.');
      setRows([]);
    } else {
      setRows(data.contributions || []);
      setError('');
    }
    setLoading(false);
  }, [periodYyyymm, ws?.refreshEpoch]);

  useEffect(() => {
    load();
  }, [load]);

  const recordContribution = async (row, contributedNgn) => {
    if (!canEdit) return;
    setBusyBranch(row.branchId);
    const { ok, data } = await apiFetch('/api/hr/branch-contributions', {
      method: 'PUT',
      body: JSON.stringify({
        branchId: row.branchId,
        periodYyyymm,
        contributedNgn: Number(contributedNgn) || 0,
        status: Number(contributedNgn) >= row.expectedNgn ? 'recorded' : 'partial',
      }),
    });
    setBusyBranch('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save contribution.');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Branch salary fund contributions to HQ for each payroll month. Outstanding amounts do not block payroll
        payment.
      </p>
      <label className="text-xs font-semibold text-slate-600">
        Period (YYYYMM)
        <input
          value={periodYyyymm}
          onChange={(e) => setPeriodYyyymm(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
        />
      </label>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {!loading ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Branch</AppTableTh>
              <AppTableTh align="right">Expected</AppTableTh>
              <AppTableTh align="right">Contributed</AppTableTh>
              <AppTableTh align="right">Outstanding</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              {canEdit ? <AppTableTh>Record</AppTableTh> : null}
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => (
                <AppTableTr key={r.branchId}>
                  <AppTableTd>{r.branchId}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.expectedNgn)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.contributedNgn)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.outstandingNgn)}</AppTableTd>
                  <AppTableTd>{r.status}</AppTableTd>
                  {canEdit ? (
                    <AppTableTd>
                      <button
                        type="button"
                        disabled={busyBranch === r.branchId}
                        onClick={() => recordContribution(r, r.expectedNgn)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Mark full
                      </button>
                    </AppTableTd>
                  ) : null}
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </div>
  );
}
