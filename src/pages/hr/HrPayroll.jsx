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
  canMdApprovePayroll,
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

function ApplyBonusModal({ runId, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/apply-bonus`, { method: 'POST' });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Could not apply bonus.'); return; }
    onSuccess('End-of-year bonus applied successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Apply End-of-Year Bonus</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700">
            Apply end-of-year bonus to this payroll run? This will add 50% of each staff member's base salary as a bonus.
          </p>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
          <button type="button" disabled={busy} onClick={confirm} className="rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Applying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const canMd = canMdApprovePayroll(perms);
  const canPay = canPayPayroll(perms);
  const canExport = canExportPayroll(perms);

  const [tab, setTab] = useState('runs');
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [varianceModalOpen, setVarianceModalOpen] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [run, setRun] = useState(null);
  const [totals, setTotals] = useState(null);
  const [lines, setLines] = useState([]);
  const [previewMode, setPreviewMode] = useState(true);
  const [message, setMessage] = useState('');
  const [newPeriod, setNewPeriod] = useState(currentPeriodYyyymm());
  const [taxPercent, setTaxPercent] = useState('7.5');
  const [pensionPercent, setPensionPercent] = useState('8');

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
    if (run?.taxPercent != null) setTaxPercent(String(run.taxPercent));
    if (run?.pensionPercent != null) setPensionPercent(String(run.pensionPercent));
  }, [run?.id, run?.taxPercent, run?.pensionPercent]);

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
      body: JSON.stringify({
        periodYyyymm: newPeriod,
        taxPercent: Number(taxPercent),
        pensionPercent: Number(pensionPercent),
      }),
    });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not create payroll run.');
      return;
    }
    setError('');
    setMessage('Payroll run created.');
    if (data.id) setSelectedId(data.id);
    await loadRuns();
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

  const mdApprove = async () => {
    if (!selectedId || !canMd) return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/md-approve`, 'POST');
    if (ok) {
      setMessage('MD approval recorded.');
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

  const saveRates = async () => {
    if (!selectedId || !canPrepare || run?.status !== 'draft') return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}`, 'PATCH', {
      taxPercent: Number(taxPercent),
      pensionPercent: Number(pensionPercent),
    });
    if (ok) {
      setMessage('Tax and pension rates updated.');
      await loadRunDetail();
    }
  };

  const tone = payrollStatusTone(run?.status);
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-900'
        : 'border-amber-200 bg-amber-50 text-amber-900';

  const linesBody = (
    <div className="space-y-4">
      {totals && !totals.amountsRedacted ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Staff" value={totals.headcount} />
            <StatCard label="Gross total" value={formatNgn(totals.grossTotalNgn)} />
            <StatCard label="Net total" value={formatNgn(totals.netTotalNgn)} />
            <StatCard label="PAYE total" value={formatNgn(totals.taxTotalNgn)} />
          </div>
          {totals.grossTotalNgn != null ? (() => {
            const gross = Number(totals.grossTotalNgn) || 0;
            const itf = gross * 0.01;
            const nsitf = gross * 0.01;
            const totalEmployerCost = gross + itf + nsitf;
            return (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Employer statutory costs</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">ITF (Employer — 1%)</span>
                  <span className="font-semibold text-amber-800 tabular-nums">{formatNgn(itf)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">NSITF (Employer — 1%)</span>
                  <span className="font-semibold text-amber-800 tabular-nums">{formatNgn(nsitf)}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-amber-200 pt-2 mt-2">
                  <span className="font-black text-teal-800">Total Employer Cost</span>
                  <span className="font-black text-teal-800 tabular-nums">{formatNgn(totalEmployerCost)}</span>
                </div>
                <p className="text-[11px] text-slate-500">ITF and NSITF are employer costs, not deducted from staff salaries.</p>
              </div>
            );
          })() : null}
        </>
      ) : null}
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Employee</AppTableTh>
            <AppTableTh align="right">Gross</AppTableTh>
            <AppTableTh align="right">Attendance ded.</AppTableTh>
            <AppTableTh align="right">Other ded.</AppTableTh>
            <AppTableTh align="right">Net</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {lines.length === 0 ? (
              <AppTableTr>
                <AppTableTd colSpan={5} align="center">
                  <span className="text-slate-500 py-4 block">
                    {run?.status === 'draft' ? 'Recompute to generate lines.' : 'No lines.'}
                  </span>
                </AppTableTd>
              </AppTableTr>
            ) : (
              lines.map((l) => (
                <AppTableTr key={l.userId}>
                  <AppTableTd>{l.displayName || l.userId}</AppTableTd>
                  <AppTableTd align="right">
                    {l.amountsRedacted ? '—' : formatNgn(l.grossNgn)}
                  </AppTableTd>
                  <AppTableTd align="right">
                    {l.amountsRedacted ? '—' : formatNgn(l.attendanceDeductionNgn)}
                  </AppTableTd>
                  <AppTableTd align="right">
                    {l.amountsRedacted ? '—' : formatNgn(l.otherDeductionNgn)}
                  </AppTableTd>
                  <AppTableTd align="right">{l.amountsRedacted ? '—' : formatNgn(l.netNgn)}</AppTableTd>
                </AppTableTr>
              ))
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
          HQ prepares payroll centrally. GM HR or MD must approve before lock; finance marks paid after treasury
          payout.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setTab('runs')}
          className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === 'runs' ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
        >
          Payroll runs
        </button>
        {canPrepare && !embedded ? (
          <button
            type="button"
            onClick={() => setTab('matrix')}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === 'matrix' ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            Salary matrix
          </button>
        ) : null}
      </div>

      {tab === 'matrix' ? <HrSalaryMatrixPanel /> : null}

      {tab === 'runs' ? (
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
                Create draft run
              </button>
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
                    GM HR: {run.gmApprovedAtIso ? 'Approved' : 'Pending'} · MD:{' '}
                    {run.mdApprovedAtIso ? 'Approved' : 'Pending'}
                  </p>
                </div>

                {run.status === 'draft' && previewMode ? (
                  <p className="text-xs font-semibold text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                    Preview mode — amounts visible after unlock; recompute refreshes from current staff records.
                  </p>
                ) : null}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                  />
                  Preview mode (draft)
                </label>

                {run.status === 'draft' && canPrepare ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <label className="text-xs text-slate-600">
                      PAYE %
                      <input
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(e.target.value)}
                        className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      Pension %
                      <input
                        value={pensionPercent}
                        onChange={(e) => setPensionPercent(e.target.value)}
                        className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={saveRates}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase"
                    >
                      Save rates
                    </button>
                    <button
                      type="button"
                      onClick={recompute}
                      className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      Recompute
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonusModalOpen(true)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-900"
                    >
                      Apply Bonus
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
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
                  {canMd && run.status === 'draft' && !run.mdApprovedAtIso ? (
                    <button
                      type="button"
                      onClick={mdApprove}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                    >
                      MD approve
                    </button>
                  ) : null}
                  {canPrepare && run.status === 'draft' && (run.gmApprovedAtIso || run.mdApprovedAtIso) ? (
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
                </div>

                {(run.status === 'locked' || run.status === 'paid' || run.status === 'md_approved' || run.status === 'gm_approved') && canExport ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payroll exports</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { k: 'hr-approval', label: 'HR approval report' },
                        { k: 'bank-upload', label: 'Bank upload CSV' },
                        { k: 'treasury', label: 'Treasury pack' },
                        { k: 'payslips', label: 'Payslips CSV' },
                        { k: 'payslips-pdf', label: 'Payslips PDF' },
                        { k: 'statutory', label: 'Statutory' },
                        { k: 'gl', label: 'GL journal' },
                      ].map(({ k, label }) => (
                        <button
                          key={k}
                          type="button"
                          title={k === 'bank-upload' ? 'Requires full bank account numbers on staff profiles' : undefined}
                          onClick={async () => {
                            const r = await downloadHrPayrollExport(selectedId, k);
                            if (!r.ok) setError(r.error);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] hover:bg-slate-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

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

      {bonusModalOpen && selectedId && (
        <ApplyBonusModal
          runId={selectedId}
          onClose={() => setBonusModalOpen(false)}
          onSuccess={(msg) => { setBonusModalOpen(false); setMessage(msg); loadRunDetail(); }}
        />
      )}

      {varianceModalOpen && selectedId && (
        <VarianceModal runId={selectedId} onClose={() => setVarianceModalOpen(false)} />
      )}
    </div>
  );
}
