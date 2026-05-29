import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrPayslipPrintModal } from '../../components/hr/HrPayslipPrintModal';
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

export default function HrPayroll() {
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
  const [previewSlip, setPreviewSlip] = useState(null);

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Staff" value={totals.headcount} />
          <StatCard label="Gross total" value={formatNgn(totals.grossTotalNgn)} />
          <StatCard label="Net total" value={formatNgn(totals.netTotalNgn)} />
          <StatCard label="PAYE total" value={formatNgn(totals.taxTotalNgn)} />
        </div>
      ) : null}
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Employee</AppTableTh>
            <AppTableTh align="right">Gross</AppTableTh>
            <AppTableTh align="right">Attendance ded.</AppTableTh>
            <AppTableTh align="right">Other ded.</AppTableTh>
            <AppTableTh align="right">Net</AppTableTh>
            {(run?.status === 'locked' || run?.status === 'paid') && !lines[0]?.amountsRedacted ? (
              <AppTableTh />
            ) : null}
          </AppTableThead>
          <AppTableBody>
            {lines.length === 0 ? (
              <AppTableTr>
                <AppTableTd colSpan={6} align="center">
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
                  {(run?.status === 'locked' || run?.status === 'paid') && !l.amountsRedacted ? (
                    <AppTableTd>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSlip({
                            runId: selectedId,
                            userId: l.userId,
                            periodYyyymm: run?.periodYyyymm,
                            runStatus: run?.status,
                            displayName: l.displayName,
                            grossNgn: l.grossNgn,
                            bonusNgn: l.bonusNgn,
                            attendanceDeductionNgn: l.attendanceDeductionNgn,
                            otherDeductionNgn: l.otherDeductionNgn,
                            taxNgn: l.taxNgn,
                            pensionNgn: l.pensionNgn,
                            netNgn: l.netNgn,
                          })
                        }
                        className="text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Preview
                      </button>
                    </AppTableTd>
                  ) : null}
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
      <p className="text-sm text-slate-600">
        HQ prepares payroll centrally. GM HR or MD must approve before lock; finance marks paid after treasury
        payout.
      </p>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setTab('runs')}
          className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === 'runs' ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
        >
          Payroll runs
        </button>
        {canPrepare ? (
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
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
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

                {(run.status === 'locked' || run.status === 'paid') && canExport ? (
                  <div className="flex flex-wrap gap-2">
                    {['treasury', 'payslips', 'payslips-pdf', 'statutory', 'gl'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={async () => {
                          const r = await downloadHrPayrollExport(selectedId, k);
                          if (!r.ok) setError(r.error);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        Export {k}
                      </button>
                    ))}
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
      <HrPayslipPrintModal
        isOpen={!!previewSlip}
        onClose={() => setPreviewSlip(null)}
        payslip={previewSlip}
      />
    </div>
  );
}
