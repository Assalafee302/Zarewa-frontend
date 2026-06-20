import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrLeave } from '../../lib/hrAccess';
import { HrPayrollPeriodFields } from '../../components/hr/HrPayrollPeriodFields';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function CarryOverModal({ onClose, onSuccess }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/leave/year-end-carryover', {
      method: 'POST',
      body: JSON.stringify({ year: Number(year) }),
    });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Carry-over failed.'); return; }
    onSuccess(`Processed ${data.processed ?? 0} staff · ${data.forfeited ?? 0} forfeited excess leave`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Year-End Carry-Over</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700">
            Run year-end leave carry-over for <strong>{year}</strong>? This will carry forward unused annual leave to next year (max 21 days) and forfeit any excess.
          </p>
          <label className="block text-xs font-semibold text-slate-600">
            Year
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </label>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
          <button type="button" disabled={busy} onClick={confirm} className="rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HrLeave({ embedded = false, showYearEndOnly = false } = {}) {
  const ws = useWorkspace();
  const canManage = canManageHrLeave(ws?.permissions);
  const [periodYyyymm, setPeriodYyyymm] = useState(currentPeriodYyyymm());
  const [balances, setBalances] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [carryOverOpen, setCarryOverOpen] = useState(false);

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

  const recomputeMaternity = async () => {
    setBusy(true);
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/leave/balances/recompute', {
      method: 'POST',
      body: JSON.stringify({ periodYyyymm, leaveType: 'maternity' }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Maternity recompute failed.');
      return;
    }
    const year = periodYyyymm.slice(0, 4);
    setMessage(`Recomputed maternity leave for ${data.users ?? 'all'} staff (${year} entitlement).`);
    await reload();
  };

  if (showYearEndOnly) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Run year-end carry-over to move unused annual leave forward (max 21 days) and forfeit excess per handbook policy.
        </p>
        {canManage ? (
          <button
            type="button"
            onClick={() => setCarryOverOpen(true)}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[11px] font-bold uppercase text-amber-900"
          >
            Year-End Carry-Over
          </button>
        ) : (
          <p className="text-sm text-slate-500">HR leave management permission required.</p>
        )}
        {carryOverOpen ? (
          <CarryOverModal
            onClose={() => setCarryOverOpen(false)}
            onSuccess={(msg) => {
              setCarryOverOpen(false);
              setMessage(msg);
            }}
          />
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-slate-600">
          Organisation leave balances and calendar. Staff apply via{' '}
          <Link to="/my-profile/leave" className="font-semibold text-[#134e4a] hover:underline">
            My HR → Leave
          </Link>
          .
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 items-end">
        <HrPayrollPeriodFields value={periodYyyymm} onChange={setPeriodYyyymm} labelMonth="Balance period" />
        {canManage ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={recompute}
              className="rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase text-white disabled:opacity-50"
            >
              Recompute annual
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={recomputeMaternity}
              className="rounded-xl border border-[#134e4a] bg-white px-4 py-2.5 text-[11px] font-bold uppercase text-[#134e4a] disabled:opacity-50"
            >
              Recompute maternity
            </button>
          </>
        ) : null}
        {canManage ? (
          <button
            type="button"
            onClick={() => setCarryOverOpen(true)}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[11px] font-bold uppercase text-amber-900"
          >
            Year-End Carry-Over
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

      {carryOverOpen && (
        <CarryOverModal
          onClose={() => setCarryOverOpen(false)}
          onSuccess={(msg) => { setCarryOverOpen(false); setMessage(msg); }}
        />
      )}

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
                        to={`${HR_EMPLOYEES}/${encodeURIComponent(b.userId)}`}
                        className="font-semibold text-[#134e4a] hover:underline"
                      >
                        {b.userId}
                      </Link>
                    </AppTableTd>
                    <AppTableTd>{b.leaveType}</AppTableTd>
                    <AppTableTd>{formatPayrollPeriodLabel(b.periodYyyymm)}</AppTableTd>
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
