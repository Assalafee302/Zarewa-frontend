import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Payroll reconciliation, bonus approval, and hold summary for a run.
 * @param {{ runId: string; canManage?: boolean }} props
 */
export function HrPayrollControlPanel({ runId, canManage = false }) {
  const [recon, setRecon] = useState(null);
  const [bonusRequests, setBonusRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError('');
    const [r1, r2] = await Promise.all([
      apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/reconciliation`),
      apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/bonus-requests`),
    ]);
    setLoading(false);
    if (!r1.ok || !r1.data?.ok) {
      setError(r1.data?.error || 'Could not load reconciliation.');
      return;
    }
    setRecon(r1.data);
    if (r2.ok && r2.data?.ok) setBonusRequests(r2.data.requests || []);
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestBonus = async () => {
    const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/bonus-requests`, {
      method: 'POST',
      body: JSON.stringify({ bonusType: 'half_month', notes: 'End-of-year bonus request' }),
    });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not request bonus.');
      return;
    }
    setMessage('Bonus request submitted for GMHR approval.');
    await load();
  };

  const approveBonus = async (id) => {
    const { ok, data } = await apiFetch(`/api/hr/bonus-requests/${encodeURIComponent(id)}/approve`, { method: 'POST' });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not approve bonus.');
      return;
    }
    setMessage('Bonus approved and applied to payroll lines.');
    await load();
  };

  if (loading) return <p className="text-sm text-slate-500">Loading payroll controls…</p>;
  if (error && !recon) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <HrCard title="Payroll reconciliation" subtitle="Compare net payroll vs bank export and held lines">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Staff on run" value={recon?.staffCount ?? '—'} />
          <Stat label="Payable" value={recon?.payCount ?? '—'} />
          <Stat label="On hold" value={recon?.heldCount ?? '—'} tone="amber" />
          <Stat label="Net total" value={recon?.payrollTotalNgn != null ? `₦${recon.payrollTotalNgn.toLocaleString()}` : '—'} />
        </div>
        {recon?.anomalies?.length ? (
          <ul className="mt-4 space-y-2">
            {recon.anomalies.map((a, i) => (
              <li key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {a.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-emerald-700 font-semibold">No reconciliation anomalies detected.</p>
        )}
      </HrCard>

      {canManage ? (
        <HrCard title="Bonus approval" subtitle="Request end-of-year bonus — requires GMHR approval before application">
          {bonusRequests.length ? (
            <ul className="space-y-2">
              {bonusRequests.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <span>
                    <span className="font-bold uppercase">{b.status}</span>
                    {' · '}
                    {b.bonusType}
                    {b.requestedAtIso ? ` · ${b.requestedAtIso.slice(0, 10)}` : ''}
                  </span>
                  {b.status === 'pending' ? (
                    <button type="button" onClick={() => approveBonus(b.id)} className={HR_BTN_PRIMARY}>
                      Approve & apply
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" onClick={requestBonus} className={HR_BTN_PRIMARY}>
              Request bonus (50% base)
            </button>
          )}
        </HrCard>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === 'amber' ? 'text-amber-800' : 'text-[#134e4a]';
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}
