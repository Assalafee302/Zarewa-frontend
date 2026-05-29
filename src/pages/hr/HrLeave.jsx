import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrLeave } from '../../lib/hrAccess';
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

export default function HrLeave() {
  const ws = useWorkspace();
  const canManage = canManageHrLeave(ws?.permissions);
  const [periodYyyymm, setPeriodYyyymm] = useState(currentPeriodYyyymm());
  const [balances, setBalances] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const { loading, error, setError, reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch(`/api/hr/leave/balances?periodYyyymm=${periodYyyymm}`);
    if (!ok || !data?.ok) {
      setBalances([]);
      return { error: data?.error || 'Could not load leave balances.', hasData: false };
    }
    setBalances(data.balances || []);
    return { hasData: true };
  }, [periodYyyymm]);

  const recompute = async () => {
    setBusy(true);
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/leave/balances/recompute', {
      method: 'POST',
      body: JSON.stringify({ periodYyyymm, leaveType: 'annual' }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Recompute failed.');
      return;
    }
    setMessage(`Recomputed annual leave for ${data.users ?? 'all'} staff.`);
    await reload();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Organisation leave balances and calendar. Staff apply via{' '}
        <Link to="/my-profile/leave" className="font-semibold text-[#134e4a] hover:underline">
          My profile → Leave
        </Link>
        .
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs font-semibold text-slate-600">
          Period (YYYYMM)
          <input
            value={periodYyyymm}
            onChange={(e) => setPeriodYyyymm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
          />
        </label>
        {canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={recompute}
            className="rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase text-white disabled:opacity-50"
          >
            Recompute annual
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-600">Loading balances…</p> : null}

      {!loading ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Leave type</AppTableTh>
              <AppTableTh>Period</AppTableTh>
              <AppTableTh align="right">Closing days</AppTableTh>
              <AppTableTh align="right">Used</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {balances.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={5} align="center">
                    <span className="text-slate-500 py-4 block">No balance rows for this period.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                balances.map((b) => (
                  <AppTableTr key={`${b.userId}-${b.leaveType}-${b.periodYyyymm}`}>
                    <AppTableTd>
                      <Link
                        to={`/hr/staff/${encodeURIComponent(b.userId)}`}
                        className="font-semibold text-[#134e4a] hover:underline"
                      >
                        {b.userId}
                      </Link>
                    </AppTableTd>
                    <AppTableTd>{b.leaveType}</AppTableTd>
                    <AppTableTd>{b.periodYyyymm}</AppTableTd>
                    <AppTableTd align="right">{b.closingDays}</AppTableTd>
                    <AppTableTd align="right">{b.usedDays}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </div>
  );
}
