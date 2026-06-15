import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import {
  canExportPayroll,
  canGmApprovePayroll,
  canPayPayroll,
  canPreparePayroll,
  canViewOrgSensitiveHr,
} from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { downloadHrPayrollExport, formatPeriodYyyymm, payrollStatusTone } from '../../lib/hrPayroll';
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

function VarianceModal({ runId, onClose }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/variance-alerts`);
      setLoading(false);
      if (!ok || !data?.ok) { setError(data?.error || 'Could not load variance alerts.'); return; }
      setAlerts(data.alerts || []);
    })();
  }, [runId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Variance Check</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          {loading && <p className="text-sm text-slate-600">Checking variances…</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!loading && !error && alerts !== null && alerts.length === 0 && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              ✓ No significant variances detected
            </p>
          )}
          {!loading && alerts && alerts.length > 0 && (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{a.displayName || a.userId}</span>
                    {a.alertType === 'missing' && (
                      <span className="ml-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-800 border-red-200">Missing</span>
                    )}
                    {a.alertType === 'new' && (
                      <span className="ml-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-800 border-sky-200">New Staff</span>
                    )}
                    {a.note && <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>}
                  </div>
                  {a.changePct != null && (
                    <span className={`shrink-0 text-xs font-bold ${Math.abs(a.changePct) >= 20 ? 'text-red-700' : 'text-amber-700'}`}>
                      {a.changePct > 0 ? '+' : ''}{a.changePct}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function HrPayroll({ embedded = false } = {}) {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(perms);
  const canPrepare = canPreparePayroll(perms);
  const canGm = canGmApprovePayroll(perms);
  const canPay = canPayPayroll(perms);
  const canExport = canExportPayroll(perms);

  const [tab, setTab] = useState('runs');
  const [varianceModalOpen, setVarianceModalOpen] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [run, setRun] = useState(null);
  const [totals, setTotals] = useState(null);
  const [lines, setLines] = useState([]);
  const [message, setMessage] = useState('');
  const [adjustingPaye, setAdjustingPaye] = useState(null);
  const [newPeriod, setNewPeriod] = useState(currentPeriodYyyymm());
  const [policyRates, setPolicyRates] = useState(null);

  const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;

  const { loading, error, setError, reload: loadRuns } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRuns([]);
      return { error: data?.error || 'Could not load payroll runs.', hasData: false };
    }
    setRuns(data.runs || []);
    setSelectedId((prev) => prev || data.runs?.[0]?.id || '');
    return { hasData: true };
  }, []);

  const loadRunDetail = useCallback(async () => {
    if (!selectedId) {
      setRun(null);
      setLines([]);
      setTotals(null);
      return;
    }
    const [runRes, linesRes, totalsRes] = await Promise.all([
      apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}`),
      fetcher(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/lines`),
      fetcher(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/totals`),
    ]);
    if (runRes.ok && runRes.data?.ok) setRun(runRes.data.run);
    else setRun(null);
    if (linesRes.ok && linesRes.data?.ok) setLines(linesRes.data.lines || []);
    else setLines([]);
    if (totalsRes.ok && totalsRes.data?.ok) setTotals(totalsRes.data.totals);
    else setTotals(null);
  }, [selectedId, fetcher]);

  useEffect(() => {
    loadRunDetail();
  }, [loadRunDetail, sensitive.isUnlocked, showSensitiveInline]);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/policy-config');
      if (ok && data?.ok) setPolicyRates(data.policy || null);
    })();
  }, []);

  const act = async (path, method = 'POST', body) => {
    setMessage('');
    const { ok, data } = await apiFetch(path, {
      method,
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return false;
    }
    setError('');
    return true;
  };

  const createRun = async () => {
    if (!canPrepare) return;
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/payroll-runs', {
      method: 'POST',
      body: JSON.stringify({ periodYyyymm: newPeriod }),
    });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not create payroll run.');
      return;
    }
    setError('');
    const parts = [`Payroll run created with ${data.headcount ?? 0} staff.`];
    if (data.yearEndBonusApplied) parts.push('December year-end bonus applied.');
    setMessage(parts.join(' '));
    if (data.id) setSelectedId(data.id);
    await loadRuns();
    await loadRunDetail();
  };

  const recompute = async () => {
    if (!selectedId || !canPrepare) return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/recompute`, 'POST');
    if (ok) {
      setMessage('Payroll recomputed.');
      await loadRunDetail();
    }
  };

  const gmApprove = async () => {
    if (!selectedId || !canGm) return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/gm-approve`, 'POST');
    if (ok) {
      setMessage('GM HR approval recorded.');
      await loadRuns();
      await loadRunDetail();
    }
  };

  const patchStatus = async (status) => {
    if (!selectedId) return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}`, 'PATCH', { status });
    if (ok) {
      setMessage(`Run marked ${status}.`);
      await loadRuns();
      await loadRunDetail();
    }
  };

  const savePayeAdjustment = async (userId, taxNgn) => {
    if (!selectedId || !canPrepare) return;
    setAdjustingPaye(userId);
    const { ok, data } = await apiFetch(
      `/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/lines/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: JSON.stringify({ taxNgn: Number(taxNgn) || 0 }) }
    );
    setAdjustingPaye(null);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save PAYE adjustment.');
      return;
    }
    await loadRunDetail();
  };

  const tone = payrollStatusTone(run?.status);
  const isDecemberRun = String(run?.periodYyyymm || '').endsWith('12');
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-900'
        : 'border-amber-200 bg-amber-50 text-amber-900';

  const loanFor = (l) =>
    l.loanDeductionNgn != null
      ? Number(l.loanDeductionNgn)
      : (l.loanDeductions || []).reduce((s, x) => s + (Number(x.amountNgn) || 0), 0);

  const recoveryFor = (l) => Number(l.incidentRecoveryNgn) || 0;

  const linesBody = (
    <div className="space-y-3">
      {totals && !totals.amountsRedacted ? (
        <p className="text-xs text-slate-600 tabular-nums">
          <span className="font-semibold text-slate-800">{totals.headcount}</span> staff · Gross{' '}
          <span className="font-semibold">{formatNgn(totals.grossTotalNgn)}</span>
          {totals.bonusTotalNgn > 0 ? <> · Bonus {formatNgn(totals.bonusTotalNgn)}</> : null} · Net{' '}
          <span className="font-semibold text-teal-800">{formatNgn(totals.netTotalNgn)}</span>
        </p>
      ) : null}
      <AppTableWrap>
        <AppTable role="numeric" className="text-xs">
          <AppTableThead>
            <AppTableTh>Employee</AppTableTh>
            <AppTableTh align="right">Gross</AppTableTh>
            <AppTableTh align="right">Bonus</AppTableTh>
            <AppTableTh align="right">Attendance</AppTableTh>
            <AppTableTh align="right">PAYE (₦)</AppTableTh>
            <AppTableTh align="right">Pension</AppTableTh>
            <AppTableTh align="right">Loans</AppTableTh>
            <AppTableTh align="right">Recoveries</AppTableTh>
            <AppTableTh align="right">Other</AppTableTh>
            <AppTableTh align="right">Net</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {lines.length === 0 ? (
              <AppTableTr>
                <AppTableTd colSpan={10} align="center">
                  <span className="text-slate-500 py-4 block">
                    {run?.status === 'draft' ? 'No active staff on payroll. Add staff or click Recompute.' : 'No lines.'}
                  </span>
                </AppTableTd>
              </AppTableTr>
            ) : (
              <>
                {lines.map((l) => (
                  <AppTableTr key={l.userId}>
                    <AppTableTd>
                      <span className="font-medium">{l.displayName || l.userId}</span>
                    </AppTableTd>
                    <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(l.grossNgn)}</AppTableTd>
                    <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(l.bonusNgn)}</AppTableTd>
                    <AppTableTd align="right">
                      {l.amountsRedacted ? '—' : formatNgn(l.attendanceDeductionNgn)}
                    </AppTableTd>
                    <AppTableTd align="right">
                      {l.amountsRedacted ? (
                        '—'
                      ) : run?.status === 'draft' && canPrepare ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={Math.round(Number(l.taxNgn) || 0)}
                          disabled={adjustingPaye === l.userId}
                          onBlur={(e) => {
                            const v = Math.round(Number(e.target.value) || 0);
                            if (v !== Math.round(Number(l.taxNgn) || 0)) savePayeAdjustment(l.userId, v);
                          }}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                        />
                      ) : (
                        formatNgn(l.taxNgn)
                      )}
                    </AppTableTd>
                    <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(l.pensionNgn)}</AppTableTd>
                    <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(loanFor(l))}</AppTableTd>
                    <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(recoveryFor(l))}</AppTableTd>
                    <AppTableTd align="right">
                      {l.amountsRedacted ? '—' : formatNgn(l.disciplinaryOtherDeductionNgn ?? 0)}
                    </AppTableTd>
                    <AppTableTd align="right" className="font-semibold">
                      {l.amountsRedacted ? '—' : formatNgn(l.netNgn)}
                    </AppTableTd>
                  </AppTableTr>
                ))}
                {totals && !totals.amountsRedacted ? (
                  <AppTableTr className="bg-slate-50 font-bold">
                    <AppTableTd>Totals</AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.grossTotalNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.bonusTotalNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.attendanceDeductionTotalNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.taxTotalNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.pensionTotalNgn)}</AppTableTd>
                    <AppTableTd align="right">
                      {formatNgn(lines.reduce((s, l) => s + (l.amountsRedacted ? 0 : loanFor(l)), 0))}
                    </AppTableTd>
                    <AppTableTd align="right">
                      {formatNgn(lines.reduce((s, l) => s + (l.amountsRedacted ? 0 : recoveryFor(l)), 0))}
                    </AppTableTd>
                    <AppTableTd align="right">
                      {formatNgn(
                        lines.reduce(
                          (s, l) => s + (l.amountsRedacted ? 0 : Number(l.disciplinaryOtherDeductionNgn) || 0),
                          0
                        )
                      )}
                    </AppTableTd>
                    <AppTableTd align="right">{formatNgn(totals.netTotalNgn)}</AppTableTd>
                  </AppTableTr>
                ) : null}
              </>
            )}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
    </div>
  );

  return (
    <div className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-slate-600">
          Branch staff monthly payroll. PAYE is a fixed ₦ amount per staff (profile or adjust on draft lines). Print the
          GM approval report before sign-off — MD approval is not required.
        </p>
      ) : null}

      {!embedded && canPrepare ? (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
          <button
            type="button"
            onClick={() => setTab('runs')}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === 'runs' ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            Payroll runs
          </button>
          <button
            type="button"
            onClick={() => setTab('matrix')}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === 'matrix' ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            Salary matrix
          </button>
        </div>
      ) : null}

      {tab === 'matrix' && !embedded ? <HrSalaryMatrixPanel /> : null}

      {tab === 'runs' || embedded ? (
        <>
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {message}
            </div>
          ) : null}

          {canPrepare ? (
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <label className="text-xs font-semibold text-slate-600">
                New period
                <input
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                />
              </label>
              <button
                type="button"
                onClick={createRun}
                className="rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase text-white"
              >
                Create payroll run
              </button>
              <p className="w-full text-xs text-slate-500">
                Branch staff only · PAYE manual per profile · pension from company policy · December = year-end bonus.
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Runs</p>
              {loading ? <p className="text-xs text-slate-500">Loading…</p> : null}
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedId === r.id ? 'border-[#134e4a] bg-teal-50/50' : 'border-slate-100 bg-white'
                  }`}
                >
                  <span className="font-semibold">{formatPeriodYyyymm(r.periodYyyymm)}</span>
                  <span className="ml-2 text-[10px] uppercase text-slate-500">{r.status}</span>
                </button>
              ))}
            </div>

            {run ? (
              <div className="space-y-4">
                <div className={`rounded-xl border px-4 py-3 ${toneCls}`}>
                  <p className="text-sm font-bold">
                    {formatPeriodYyyymm(run.periodYyyymm)} · {run.status}
                  </p>
                  <p className="mt-1 text-xs">
                    GM HR: {run.gmApprovedAtIso ? 'Approved' : 'Pending sign-off'}
                    {isDecemberRun
                      ? ` · December bonus (${Math.round((policyRates?.halfMonthBonusRate ?? 0.5) * 100)}% of base)`
                      : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {run.status === 'draft' && canPrepare ? (
                    <button
                      type="button"
                      onClick={recompute}
                      className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      Recompute
                    </button>
                  ) : null}
                  {(canPrepare || canExport) && run.status === 'draft' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await downloadHrPayrollExport(selectedId, 'approval-report');
                        if (!r.ok) setError(r.error);
                      }}
                      className="rounded-lg border border-[#134e4a] bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                    >
                      Print GM approval report
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setVarianceModalOpen(true)}
                    className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-bold uppercase text-sky-800"
                  >
                    Variance Check
                  </button>
                  {canGm && run.status === 'draft' && !run.gmApprovedAtIso ? (
                    <button
                      type="button"
                      onClick={gmApprove}
                      className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      GM HR approve
                    </button>
                  ) : null}
                  {canPrepare && run.status === 'draft' && run.gmApprovedAtIso ? (
                    <button
                      type="button"
                      onClick={() => patchStatus('locked')}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      Lock run
                    </button>
                  ) : null}
                  {canPrepare && run.status === 'locked' ? (
                    <button
                      type="button"
                      onClick={() => patchStatus('draft')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase"
                    >
                      Unlock to draft
                    </button>
                  ) : null}
                  {canPay && run.status === 'locked' ? (
                    <button
                      type="button"
                      onClick={() => patchStatus('paid')}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      Mark paid
                    </button>
                  ) : null}
                  {(run.status === 'locked' || run.status === 'paid') && (canExport || canPay) ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'bank-upload');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Bank payment file
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'treasury');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Treasury pack
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'statutory');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Statutory pack
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'payslips');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Payslips CSV
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'payslips-pdf');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Payslips PDF
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, 'gl');
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        GL journal
                      </button>
                    </>
                  ) : null}
                </div>

                {showSensitiveInline ? (
                  linesBody
                ) : (
                  <HrSensitiveGate label="View payroll line amounts">{linesBody}</HrSensitiveGate>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">Select or create a payroll run.</p>
            )}
          </div>
        </>
      ) : null}

      {varianceModalOpen && selectedId && (
        <VarianceModal runId={selectedId} onClose={() => setVarianceModalOpen(false)} />
      )}
    </div>
  );
}
