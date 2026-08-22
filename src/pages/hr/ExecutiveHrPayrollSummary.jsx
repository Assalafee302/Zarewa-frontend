import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canMdApprovePayroll } from '../../lib/hrAccess';
import { mdApprovePayrollRun } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function ExecutiveHrPayrollSummary() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canMd = canMdApprovePayroll(perms);
  const [runs, setRuns] = React.useState([]);
  const [totalsByRun, setTotalsByRun] = React.useState({});
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const { loading, reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRuns([]);
      setTotalsByRun({});
      return { error: data?.error || 'Could not load payroll.', hasData: false };
    }
    const list = data.runs || [];
    setRuns(list);

    const recent = list.slice(0, 12);
    const totals = {};
    await Promise.all(
      recent.map(async (run) => {
        const { ok: tOk, data: tData } = await apiFetch(
          `/api/hr/payroll-runs/${encodeURIComponent(run.id)}/totals`
        );
        totals[run.id] = tOk && tData?.ok ? tData.totals : null;
      })
    );
    setTotalsByRun(totals);
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

  const displayRuns = runs.slice(0, 12);

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
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Draft</p>
          <p className="z-stencil text-2xl text-slate-900">{draft.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Locked</p>
          <p className="z-stencil text-2xl text-slate-900">{locked.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Paid</p>
          <p className="z-stencil text-2xl text-slate-900">{paid.length}</p>
        </div>
      </div>

      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead sticky>
            <AppTableTh>Period</AppTableTh>
            <AppTableTh>Status</AppTableTh>
            <AppTableTh align="right">Staff</AppTableTh>
            <AppTableTh align="right">Net pay</AppTableTh>
            <AppTableTh>GM</AppTableTh>
            <AppTableTh>MD</AppTableTh>
            {canMd ? <AppTableTh align="right">Action</AppTableTh> : null}
          </AppTableThead>
          <AppTableBody>
            {loading && !displayRuns.length ? (
              <HrTableLoadingRow colSpan={canMd ? 7 : 6} message="Loading payroll runs…" />
            ) : null}
            {!loading && !displayRuns.length ? (
              <HrTableEmptyRow colSpan={canMd ? 7 : 6} message="No payroll runs yet." />
            ) : null}
            {displayRuns.map((r) => {
              const totals = totalsByRun[r.id];
              const needsMd = canMd && r.status === 'draft' && !r.mdApprovedAtIso;
              return (
                <AppTableTr key={r.id}>
                  <AppTableTd className="font-semibold">{formatPeriodYyyymm(r.periodYyyymm)}</AppTableTd>
                  <AppTableTd>
                    <HrStatusBadge status={r.status} variant="payroll" />
                  </AppTableTd>
                  <AppTableTd align="right">
                    {totals && !totals.amountsRedacted ? totals.headcount ?? '—' : '—'}
                  </AppTableTd>
                  <AppTableTd align="right">
                    {totals && !totals.amountsRedacted ? formatNgn(totals.netNgn) : '—'}
                  </AppTableTd>
                  <AppTableTd>
                    {r.gmApprovedAtIso ? (
                      <span className="text-xs font-semibold text-emerald-700">Approved</span>
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </AppTableTd>
                  <AppTableTd>
                    {r.mdApprovedAtIso ? (
                      <span className="text-xs font-semibold text-emerald-700">Approved</span>
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </AppTableTd>
                  {canMd ? (
                    <AppTableTd align="right" truncate={false}>
                      {needsMd ? (
                        <button
                          type="button"
                          onClick={() => approveRun(r.id)}
                          className="rounded-md bg-zarewa-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0f3d3a]"
                        >
                          MD approve
                        </button>
                      ) : (
                        '—'
                      )}
                    </AppTableTd>
                  ) : null}
                </AppTableTr>
              );
            })}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>

      {canMd && pendingMd.length > 0 ? (
        <p className="text-xs text-slate-600">
          {pendingMd.length} draft run{pendingMd.length === 1 ? '' : 's'} awaiting MD sign-off (shown in table above).
        </p>
      ) : null}

      <Link to="/hr/payroll" className="text-sm font-bold text-zarewa-teal hover:underline">
        Open payroll module →
      </Link>
    </div>
  );
}
