import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canMdApprovePayroll } from '../../lib/hrAccess';
import { mdApprovePayrollRun } from '../../lib/hrExtended';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';

export default function ExecutiveHrPayrollSummary() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canMd = canMdApprovePayroll(perms);
  const [runs, setRuns] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const { loading, reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRuns([]);
      return { error: data?.error || 'Could not load payroll.', hasData: false };
    }
    setRuns(data.runs || []);
    return { hasData: true };
  }, []);

  const draft = runs.filter((r) => r.status === 'draft');
  const locked = runs.filter((r) => r.status === 'locked');
  const paid = runs.filter((r) => r.status === 'paid');
  const pendingMd = draft.filter((r) => !r.mdApprovedAtIso && !r.gmApprovedAtIso);

  const approveRun = async (runId) => {
    setMessage('');
    setError('');
    const { ok, data } = await mdApprovePayrollRun(runId);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not approve payroll run.');
      return;
    }
    setMessage('MD payroll approval recorded.');
    await reload();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Payroll run status across HQ. Branch, HQ admin, and mining staff are paid via Human Resources → Payroll.
      </p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-amber-800">Draft</p>
          <p className="text-2xl font-black">{draft.length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-blue-800">Locked</p>
          <p className="text-2xl font-black">{locked.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-emerald-800">Paid</p>
          <p className="text-2xl font-black">{paid.length}</p>
        </div>
      </div>

      {canMd && pendingMd.length > 0 ? (
        <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-purple-900">Awaiting sign-off</p>
          <ul className="space-y-2">
            {pendingMd.slice(0, 6).map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-lg bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{formatPeriodYyyymm(r.periodYyyymm)}</span>
                <button
                  type="button"
                  onClick={() => approveRun(r.id)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-purple-800 px-3 py-2 text-[10px] font-bold uppercase text-white sm:w-auto touch-manipulation"
                >
                  MD approve
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="text-sm divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
        {runs.slice(0, 8).map((r) => (
          <li key={r.id} className="flex justify-between px-4 py-2">
            <span>{formatPeriodYyyymm(r.periodYyyymm)}</span>
            <span className="capitalize font-semibold">{r.status}</span>
          </li>
        ))}
      </ul>
      <Link to="/hr/payroll" className="text-sm font-bold text-[#134e4a] hover:underline">
        Open payroll module →
      </Link>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
