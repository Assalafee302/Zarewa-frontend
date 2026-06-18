import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import { HrPayrollControlPanel } from '../../components/hr/HrPayrollControlPanel';
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
import { mdApprovePayrollRun } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { getHrPayrollIntro } from '../../lib/hrDashboardUi';
import { downloadHrPayrollExport, formatPeriodYyyymm, payrollStatusTone } from '../../lib/hrPayroll';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import { useAppTablePaging } from '../../lib/appDataTable';

/** Touch-friendly payroll action button — 44px min height for mobile. */
const PAYROLL_BTN =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase touch-manipulation active:scale-[0.98] transition-transform';
const PAYROLL_BTN_PRIMARY = `${PAYROLL_BTN} bg-[#134e4a] text-white`;
const PAYROLL_BTN_SECONDARY = `${PAYROLL_BTN} border border-slate-200 bg-white text-[#134e4a]`;
const PAYROLL_BTN_DANGER = `${PAYROLL_BTN} border border-red-200 bg-red-50 text-red-800`;
const PAYROLL_BTN_INFO = `${PAYROLL_BTN} border border-sky-200 bg-sky-50 text-sky-800`;
const PAYROLL_BTN_MD = `${PAYROLL_BTN} bg-purple-800 text-white`;
const PAYROLL_BTN_LOCK = `${PAYROLL_BTN} bg-slate-800 text-white`;
const PAYROLL_BTN_PAID = `${PAYROLL_BTN} bg-emerald-700 text-white w-full sm:w-auto`;

function MissingBankModal({ runId, onClose }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/missing-bank`);
      setLoading(false);
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load missing bank accounts.');
        return;
      }
      setStaff(data.staff || []);
    })();
  }, [runId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Missing bank accounts</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-sm text-slate-600">Loading…</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!loading && !error && staff.length === 0 && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              All payable staff have bank details on file.
            </p>
          )}
          {!loading && staff.length > 0 && (
            <ul className="space-y-2">
              {staff.map((s) => (
                <li key={s.userId} className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-sm">
                  <span className="font-semibold text-slate-800">{s.displayName || s.userId}</span>
                  {s.employeeNo ? <span className="ml-2 text-xs text-slate-500">{s.employeeNo}</span> : null}
                  <p className="text-xs text-slate-600 mt-0.5">Net {formatNgn(s.netNgn)} · update staff profile bank details</p>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
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
                      <HrStatusBadge status="missing_staff" variant="alert" label="Missing" />
                    )}
                    {a.alertType === 'new' && (
                      <HrStatusBadge status="new_staff" variant="alert" />
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
  const [varianceModalOpen, setVarianceModalOpen] = useState(false);
  const [missingBankOpen, setMissingBankOpen] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [run, setRun] = useState(null);
  const [totals, setTotals] = useState(null);
  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adjustingPaye, setAdjustingPaye] = useState(null);
  const [newPeriod, setNewPeriod] = useState(currentPeriodYyyymm());
  const [policyRates, setPolicyRates] = useState(null);
  const [payTreasuryAccountId, setPayTreasuryAccountId] = useState('');

  const bankTreasuryAccounts = React.useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.treasuryAccounts) ? ws.snapshot.treasuryAccounts : []).filter((a) => {
        const t = String(a?.type || '').toLowerCase();
        return t === 'bank' || t === 'current' || t === 'savings' || !t;
      }),
    [ws?.snapshot?.treasuryAccounts]
  );

  useEffect(() => {
    if (!payTreasuryAccountId && bankTreasuryAccounts.length) {
      setPayTreasuryAccountId(String(bankTreasuryAccounts[0].id));
    }
  }, [bankTreasuryAccounts, payTreasuryAccountId]);

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
      setLinesLoading(false);
      return;
    }
    setLinesLoading(true);
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
    setLinesLoading(false);
  }, [selectedId, fetcher]);

  useEffect(() => {
    loadRunDetail();
  }, [loadRunDetail, sensitive.isUnlocked, showSensitiveInline]);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/policy-config');
      if (ok && data?.ok) {
        setPolicyRates(data.policy || null);
        const defaultAcct = data.policy?.payrollTreasuryAccountId;
        if (defaultAcct != null) {
          setPayTreasuryAccountId((prev) => prev || String(defaultAcct));
        }
      }
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

  const mdApprove = async () => {
    if (!selectedId || !canMd) return;
    const { ok, data } = await mdApprovePayrollRun(selectedId);
    if (!ok || !data?.ok) {
      setError(data?.error || 'MD approval failed.');
      return;
    }
    setError('');
    setMessage('MD payroll approval recorded.');
    await loadRuns();
    await loadRunDetail();
  };

  const patchStatus = async (status, extra = {}) => {
    if (!selectedId) return;
    const ok = await act(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}`, 'PATCH', { status, ...extra });
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

  const downloadExport = async (kind) => {
    if (!selectedId) return;
    const r = await downloadHrPayrollExport(selectedId, kind);
    if (!r.ok) setError(r.error);
  };

  const exportActions = [
    { kind: 'bank-upload', label: 'Bank payment file' },
    { kind: 'treasury', label: 'Treasury pack' },
    { kind: 'statutory', label: 'Statutory pack' },
    { kind: 'payslips', label: 'Payslips CSV' },
    { kind: 'payslips-pdf', label: 'Payslips PDF' },
    { kind: 'hr-approval', label: 'HR approval CSV' },
    { kind: 'gl', label: 'GL journal' },
  ];

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

  const payeField = (l) => {
    if (l.amountsRedacted) return '—';
    if (run?.status === 'draft' && canPrepare) {
      return (
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
          className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          inputMode="numeric"
          aria-label={`PAYE for ${l.displayName || l.userId}`}
        />
      );
    }
    return formatNgn(l.taxNgn);
  };

  const linesPaging = useAppTablePaging(lines, 20, selectedId);

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

      {linesLoading && !lines.length ? (
        <>
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 md:hidden">
            Loading payroll lines…
          </p>
          <div className="hidden md:block">
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
                  <HrTableLoadingRow colSpan={10} message="Loading payroll lines…" />
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </>
      ) : lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
          {run?.status === 'draft' ? 'No active staff on payroll. Add staff or click Recompute.' : 'No lines.'}
        </p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {linesPaging.slice.map((l) => (
              <article
                key={`${l.userId}-m`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{l.displayName || l.userId}</p>
                  <p className="shrink-0 text-sm font-black tabular-nums text-teal-800">
                    {l.amountsRedacted ? '—' : formatNgn(l.netNgn)}
                  </p>
                </div>
                {l.amountsRedacted ? (
                  <p className="mt-2 text-xs text-slate-500">Amounts restricted</p>
                ) : (
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Gross</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(l.grossNgn)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Bonus</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(l.bonusNgn)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Attendance</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(l.attendanceDeductionNgn)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Pension</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(l.pensionNgn)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Loans</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(loanFor(l))}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Recoveries</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(recoveryFor(l))}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Other</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-800">{formatNgn(l.disciplinaryOtherDeductionNgn ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-slate-400">PAYE</dt>
                      <dd className="mt-0.5">{payeField(l)}</dd>
                    </div>
                  </dl>
                )}
              </article>
            ))}
            {totals && !totals.amountsRedacted ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold tabular-nums">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Run totals</p>
                <div className="grid grid-cols-2 gap-2">
                  <span>Gross {formatNgn(totals.grossTotalNgn)}</span>
                  <span>Net {formatNgn(totals.netTotalNgn)}</span>
                  <span>PAYE {formatNgn(totals.taxTotalNgn)}</span>
                  <span>Pension {formatNgn(totals.pensionTotalNgn)}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden md:block">
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
            {linesPaging.slice.map((l) => (
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
                          className="w-24 min-h-[36px] rounded border border-slate-200 px-2 py-1 text-right text-xs"
                          inputMode="numeric"
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
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
          </div>
          {linesPaging.total > linesPaging.pageSize ? (
            <AppTablePager
              showingFrom={linesPaging.showingFrom}
              showingTo={linesPaging.showingTo}
              total={linesPaging.total}
              hasPrev={linesPaging.hasPrev}
              hasNext={linesPaging.hasNext}
              onPrev={linesPaging.goPrev}
              onNext={linesPaging.goNext}
            />
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-slate-600">{getHrPayrollIntro(canPrepare, canGm)}</p>
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
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="text-xs font-semibold text-slate-600 w-full sm:w-auto">
                New period
                <input
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1 block w-full sm:w-32 rounded-xl border border-slate-200 px-3 py-3 font-mono text-sm"
                  inputMode="numeric"
                  aria-label="Payroll period YYYYMM"
                />
              </label>
              <button type="button" onClick={createRun} className={`${PAYROLL_BTN_PRIMARY} w-full sm:w-auto`}>
                Create payroll run
              </button>
              <p className="w-full text-xs text-slate-500 leading-relaxed">
                Branch, HQ admin, and mining staff · PAYE manual per profile · pension from policy · December bonus.
              </p>
            </div>
          ) : null}

          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,240px)_1fr] lg:gap-6 lg:space-y-0">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Runs</p>
              {loading ? <p className="text-xs text-slate-500">Loading…</p> : null}

              <label className="md:hidden block text-xs font-semibold text-slate-600">
                Select run
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium"
                >
                  {runs.length === 0 ? <option value="">No runs yet</option> : null}
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatPeriodYyyymm(r.periodYyyymm)} — {r.status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="hidden md:block space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm min-h-[44px] ${
                      selectedId === r.id ? 'border-[#134e4a] bg-teal-50/50' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <span className="font-semibold">{formatPeriodYyyymm(r.periodYyyymm)}</span>
                    <HrStatusBadge status={r.status} variant="payroll" className="ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {run ? (
              <div className="space-y-4">
                <div className={`rounded-xl border px-4 py-3 ${toneCls}`}>
                  <p className="text-sm font-bold">
                    {formatPeriodYyyymm(run.periodYyyymm)} · {run.status}
                  </p>
                  <p className="mt-1 text-xs">
                    GM HR: {run.gmApprovedAtIso ? 'Approved' : 'Pending'}
                    {' · '}
                    MD: {run.mdApprovedAtIso ? 'Approved' : 'Pending'}
                    {isDecemberRun
                      ? ` · December bonus (${Math.round((policyRates?.halfMonthBonusRate ?? 0.5) * 100)}% of base)`
                      : ''}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {run.status === 'draft' && canPrepare ? (
                      <button type="button" onClick={recompute} className={`${PAYROLL_BTN_PRIMARY} w-full sm:w-auto`}>
                        Recompute
                      </button>
                    ) : null}
                    {(canPrepare || canExport) && run.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => downloadExport('approval-report')}
                        className={`${PAYROLL_BTN_SECONDARY} w-full sm:w-auto`}
                      >
                        GM approval PDF
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setVarianceModalOpen(true)} className={`${PAYROLL_BTN_INFO} w-full sm:w-auto`}>
                      Variance check
                    </button>
                    <button type="button" onClick={() => setMissingBankOpen(true)} className={`${PAYROLL_BTN_DANGER} w-full sm:w-auto`}>
                      Missing banks
                    </button>
                    {canGm && run.status === 'draft' && !run.gmApprovedAtIso ? (
                      <button type="button" onClick={gmApprove} className={`${PAYROLL_BTN_PRIMARY} w-full sm:w-auto`}>
                        GM HR approve
                      </button>
                    ) : null}
                    {canMd && run.status === 'draft' && !run.mdApprovedAtIso ? (
                      <button type="button" onClick={mdApprove} className={`${PAYROLL_BTN_MD} w-full sm:w-auto`}>
                        MD approve
                      </button>
                    ) : null}
                    {canPrepare && run.status === 'draft' && (run.gmApprovedAtIso || run.mdApprovedAtIso) ? (
                      <button type="button" onClick={() => patchStatus('locked')} className={`${PAYROLL_BTN_LOCK} w-full sm:w-auto`}>
                        Lock run
                      </button>
                    ) : null}
                    {canPrepare && run.status === 'locked' ? (
                      <button type="button" onClick={() => patchStatus('draft')} className={`${PAYROLL_BTN_SECONDARY} w-full sm:w-auto`}>
                        Unlock to draft
                      </button>
                    ) : null}
                  </div>

                  {canPay && run.status === 'locked' ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                      {bankTreasuryAccounts.length ? (
                        <label className="text-xs font-semibold text-slate-600 w-full sm:max-w-xs">
                          Pay from account
                          <select
                            value={payTreasuryAccountId}
                            onChange={(e) => setPayTreasuryAccountId(e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                            aria-label="Treasury account for payroll payout"
                          >
                            {bankTreasuryAccounts.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                {a.name || a.bankName || `Account ${a.id}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="text-xs text-amber-900">Add a treasury bank account in Finance, or set a default under Payroll → Statutory.</p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          patchStatus('paid', {
                            treasuryAccountId: payTreasuryAccountId ? Number(payTreasuryAccountId) : undefined,
                          })
                        }
                        disabled={!payTreasuryAccountId}
                        className={`${PAYROLL_BTN_PAID} disabled:opacity-50`}
                      >
                        Mark paid & post treasury
                      </button>
                    </div>
                  ) : null}

                  {(run.status === 'locked' || run.status === 'paid') && (canExport || canPay) ? (
                    <>
                      <details className="rounded-xl border border-slate-200 bg-white sm:hidden">
                        <summary className="min-h-[44px] cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase text-[#134e4a] touch-manipulation">
                          Downloads & exports
                        </summary>
                        <div className="flex flex-col gap-2 border-t border-slate-100 p-3">
                          {exportActions.map((ex) => (
                            <button
                              key={ex.kind}
                              type="button"
                              onClick={() => downloadExport(ex.kind)}
                              className={`${PAYROLL_BTN_SECONDARY} w-full`}
                            >
                              {ex.label}
                            </button>
                          ))}
                        </div>
                      </details>
                      <div className="hidden sm:flex sm:flex-wrap gap-2">
                        {exportActions.map((ex) => (
                          <button
                            key={ex.kind}
                            type="button"
                            onClick={() => downloadExport(ex.kind)}
                            className={PAYROLL_BTN_SECONDARY}
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                {(canPrepare || canExport || canPay) && selectedId && (run.status === 'locked' || run.status === 'paid' || run.status === 'draft') ? (
                  <HrPayrollControlPanel
                    runId={selectedId}
                    canManage={canPrepare}
                    netPayableNgn={totals?.amountsRedacted ? null : totals?.netTotalNgn ?? null}
                  />
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

      {varianceModalOpen && selectedId && (
        <VarianceModal runId={selectedId} onClose={() => setVarianceModalOpen(false)} />
      )}
      {missingBankOpen && selectedId && (
        <MissingBankModal runId={selectedId} onClose={() => setMissingBankOpen(false)} />
      )}
    </div>
  );
}
