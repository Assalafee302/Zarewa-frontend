import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPayrollPeriodLabel, formatPayrollPeriodShort } from '../../lib/hrPayroll';
import { HrPolicyConfigSection } from '../../components/hr/HrSettingsSections';
import { HrSubViewTabs } from '../../components/hr/HrSubViewTabs';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const STATUTORY_BTN =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-bold uppercase text-white touch-manipulation active:scale-[0.98] transition-transform sm:w-auto';

// ── CSV export helper ──────────────────────────────────────────────────────────
function downloadCsv(filename, rows, headers) {
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${r[h] || ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Shared stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-ui-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

// ── Bar chart (simple SVG) ────────────────────────────────────────────────────
function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 36;
  const gap = 10;
  const chartH = 80;
  const totalW = data.length * (barW + gap);
  return (
    <svg width={totalW} height={chartH + 24} className="overflow-visible">
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.value / max) * chartH));
        const x = i * (barW + gap);
        const y = chartH - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx={4} fill="var(--color-zarewa-teal)" opacity={0.8} />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#64748b">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="var(--color-zarewa-teal)">
              {formatNgn(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PAYE TAB
// ════════════════════════════════════════════════════════════════════════════════
function PayeTab({ runs, lines, latestRun, loading }) {
  const staffPaye = useMemo(() => {
    return lines.map((l) => {
      const gross = Number(l.grossNgn) || 0;
      const payeAmount = Math.round(Number(l.taxNgn) || 0);
      return {
        name: l.displayName || l.userId,
        userId: l.userId,
        gross,
        payeAmount,
        amountsRedacted: l.amountsRedacted,
      };
    });
  }, [lines]);

  const totalPaye = useMemo(() => staffPaye.reduce((s, x) => s + (x.amountsRedacted ? 0 : x.payeAmount), 0), [staffPaye]);

  // Monthly trend from runs
  const trendData = useMemo(() => {
    return runs
      .slice(-6)
      .map((r) => ({
        label: formatPayrollPeriodShort(r.periodYyyymm),
        value: Number(r.payeTotalNgn) || 0,
      }));
  }, [runs]);

  // Filing history from runs
  const filingHistory = useMemo(
    () =>
      runs
        .filter((r) => r.status === 'paid' || r.status === 'locked')
        .slice(-12)
        .reverse()
        .map((r) => ({
          period: formatPayrollPeriodLabel(r.periodYyyymm),
          amount: formatNgn(r.payeTotalNgn ?? totalPaye),
          status: r.payeFiled ? 'Filed' : 'Pending',
          runStatus: r.status,
        })),
    [runs, totalPaye],
  );

  const ytd = useMemo(() => {
    const year = new Date().getFullYear();
    return runs
      .filter((r) => String(r.periodYyyymm).startsWith(String(year)) && (r.status === 'paid' || r.status === 'locked'))
      .reduce((s, r) => s + (Number(r.payeTotalNgn) || totalPaye), 0);
  }, [runs, totalPaye]);

  const exportFirs = () => {
    const headers = ['employee_name', 'gross_monthly', 'paye_monthly_ngn'];
    const rows = staffPaye
      .filter((s) => !s.amountsRedacted)
      .map((s) => ({
        employee_name: s.name,
        gross_monthly: Math.round(s.gross),
        paye_monthly_ngn: Math.round(s.payeAmount),
      }));
    const period = latestRun ? formatPayrollPeriodLabel(latestRun.periodYyyymm) : 'current';
    downloadCsv(`FIRS-PAYE-Schedule-${period}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="PAYE basis" value="Fixed ₦" sub="Monthly amount per staff profile" />
        <StatCard
          label="This month PAYE"
          value={loading ? '…' : formatNgn(totalPaye)}
          sub={latestRun ? formatPayrollPeriodLabel(latestRun.periodYyyymm) : ''}
        />
        <StatCard label="YTD remitted" value={loading ? '…' : formatNgn(ytd)} sub={`${new Date().getFullYear()}`} />
        <StatCard
          label="Filing status"
          value={latestRun?.payeFiled ? 'Filed' : 'Pending'}
          sub={latestRun?.status || '—'}
        />
      </div>

      {/* Per-staff table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Per-staff PAYE</h3>
          <button type="button" onClick={exportFirs} className={STATUTORY_BTN}>
            Export FIRS Schedule
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-slate-500">Loading…</p>
        ) : staffPaye.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            No lines. Select a payroll run with computed lines.
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {staffPaye.map((s) => (
                <article key={`${s.userId}-m`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-500">Gross</span>
                    <span className="tabular-nums font-medium">{s.amountsRedacted ? '—' : formatNgn(s.gross)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-slate-500">PAYE</span>
                    <span className="tabular-nums font-bold text-zarewa-teal">
                      {s.amountsRedacted ? '—' : formatNgn(s.payeAmount)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh align="right">Gross (monthly)</AppTableTh>
              <AppTableTh align="right">PAYE (₦)</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {loading ? (
                <AppTableTr>
                  <AppTableTd colSpan={3} align="center">
                    <span className="py-4 block text-slate-500 text-sm">Loading…</span>
                  </AppTableTd>
                </AppTableTr>
              ) : staffPaye.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={3} align="center">
                    <span className="py-4 block text-slate-500 text-sm">
                      No lines. Select a payroll run with computed lines.
                    </span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                staffPaye.map((s) => (
                  <AppTableTr key={s.userId}>
                    <AppTableTd>{s.name}</AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.gross)}</AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.payeAmount)}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
            </div>
          </>
        )}
      </div>

      {/* Monthly trend */}
      {trendData.some((d) => d.value > 0) ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-ui-xs font-black uppercase tracking-widest text-slate-500">
            Monthly PAYE trend (last 6 months)
          </h3>
          <div className="overflow-x-auto pb-2">
            <MiniBarChart data={trendData} />
          </div>
        </div>
      ) : null}

      {/* Filing history */}
      {filingHistory.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-ui-xs font-black uppercase tracking-widest text-slate-500">Filing history</h3>
          <div className="space-y-2 md:hidden">
            {filingHistory.map((h) => (
              <article key={`${h.period}-m`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{h.period}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-ui-xs font-bold ${
                      h.status === 'Filed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {h.status}
                  </span>
                </div>
                <p className="mt-1 tabular-nums text-slate-700">{h.amount}</p>
                <p className="mt-0.5 capitalize text-slate-500">{h.runStatus}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Period</AppTableTh>
                <AppTableTh align="right">PAYE amount</AppTableTh>
                <AppTableTh>Run status</AppTableTh>
                <AppTableTh>Filing status</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {filingHistory.map((h) => (
                  <AppTableTr key={h.period}>
                    <AppTableTd>{h.period}</AppTableTd>
                    <AppTableTd align="right">{h.amount}</AppTableTd>
                    <AppTableTd>
                      <span className="capitalize">{h.runStatus}</span>
                    </AppTableTd>
                    <AppTableTd>
                      <span
                        className={`rounded-full px-2 py-0.5 text-ui-xs font-bold ${
                          h.status === 'Filed'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PENSION TAB
// ════════════════════════════════════════════════════════════════════════════════
function PensionTab({ runs, lines, latestRun, loading, policy }) {
  const staffPension = useMemo(() => {
    return lines.map((l) => {
      const gross = Number(l.grossNgn) || 0;
      const empContrib = Math.round(Number(l.pensionNgn) || 0);
      const errContrib = Math.round(Number(l.pensionEmployerNgn) || 0);
      return {
        name: l.displayName || l.userId,
        userId: l.userId,
        pfaName: l.pfaName || '—',
        rsaPin: l.pensionRsaPin || '—',
        gross,
        empContrib,
        errContrib,
        ytdTotal: empContrib + errContrib,
        amountsRedacted: l.amountsRedacted,
        missingRsa: !l.pensionRsaPin,
      };
    });
  }, [lines]);

  const missingRsaCount = useMemo(() => staffPension.filter((s) => s.missingRsa).length, [staffPension]);

  const totalEmp = useMemo(
    () => staffPension.reduce((s, x) => s + (x.amountsRedacted ? 0 : x.empContrib), 0),
    [staffPension],
  );
  const totalErr = useMemo(
    () => staffPension.reduce((s, x) => s + (x.amountsRedacted ? 0 : x.errContrib), 0),
    [staffPension],
  );
  const totalMonth = totalEmp + totalErr;

  const ytd = useMemo(() => {
    const year = new Date().getFullYear();
    return runs
      .filter((r) => String(r.periodYyyymm).startsWith(String(year)) && (r.status === 'paid' || r.status === 'locked'))
      .reduce((s, r) => s + (Number(r.pensionTotalNgn) || totalMonth), 0);
  }, [runs, totalMonth]);

  const remittanceHistory = useMemo(
    () =>
      runs
        .filter((r) => r.status === 'paid' || r.status === 'locked')
        .slice(-12)
        .reverse()
        .map((r) => ({
          period: formatPayrollPeriodLabel(r.periodYyyymm),
          total: formatNgn(r.pensionTotalNgn ?? totalMonth),
          status: r.pensionRemitted ? 'Remitted' : 'Pending',
          runStatus: r.status,
        })),
    [runs, totalMonth],
  );

  const exportPfa = () => {
    const headers = ['employee_name', 'pfa_name', 'rsa_pin', 'employee_contribution', 'employer_contribution'];
    const rows = staffPension
      .filter((s) => !s.amountsRedacted)
      .map((s) => ({
        employee_name: s.name,
        pfa_name: s.pfaName,
        rsa_pin: s.rsaPin,
        employee_contribution: Math.round(s.empContrib),
        employer_contribution: Math.round(s.errContrib),
      }));
    const period = latestRun ? formatPayrollPeriodLabel(latestRun.periodYyyymm) : 'current';
    downloadCsv(`PFA-Pension-Schedule-${period}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Alert: missing RSA pins */}
      {missingRsaCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{missingRsaCount} staff</strong> have missing RSA pins. Update their profiles before remitting
          pension contributions.
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Employee rate"
          value={`${policy?.pensionEmployeePercent ?? 8}%`}
          sub="Company policy — HR Executive"
        />
        <StatCard
          label="Employer rate"
          value={`${policy?.pensionEmployerPercent ?? 10}%`}
          sub="Company policy — HR Executive"
        />
        <StatCard
          label="This month total"
          value={loading ? '…' : formatNgn(totalMonth)}
          sub={`Emp: ${formatNgn(totalEmp)} + Err: ${formatNgn(totalErr)}`}
        />
        <StatCard label="YTD remitted" value={loading ? '…' : formatNgn(ytd)} sub={`${new Date().getFullYear()}`} />
      </div>

      {/* Contribution breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Contribution computation (latest run)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Staff count</p>
            <p className="mt-1 text-xl font-black">{staffPension.length}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Employee contributions</p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNgn(totalEmp)}</p>
            <p className="text-ui-xs text-slate-500">{policy?.pensionEmployeePercent ?? 8}% × gross (eligible staff)</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Employer contributions</p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNgn(totalErr)}</p>
            <p className="text-ui-xs text-slate-500">{policy?.pensionEmployerPercent ?? 10}% × gross (eligible staff)</p>
          </div>
        </div>
      </div>

      {/* Per-staff RSA table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Per-staff RSA contributions</h3>
          <button type="button" onClick={exportPfa} className={STATUTORY_BTN}>
            Export PFA Schedule
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-slate-500">Loading…</p>
        ) : staffPension.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            No lines. Select a payroll run with computed lines.
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {staffPension.map((s) => (
                <article
                  key={`${s.userId}-m`}
                  className={`rounded-xl border p-3 ${s.missingRsa ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/50'}`}
                >
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.pfaName}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    RSA:{' '}
                    {s.missingRsa ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-ui-xs font-bold text-red-700">Missing</span>
                    ) : (
                      s.rsaPin
                    )}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Employee</span>
                      <p className="tabular-nums font-medium">{s.amountsRedacted ? '—' : formatNgn(s.empContrib)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Employer</span>
                      <p className="tabular-nums font-medium">{s.amountsRedacted ? '—' : formatNgn(s.errContrib)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>PFA</AppTableTh>
              <AppTableTh>RSA pin</AppTableTh>
              <AppTableTh align="right">Employee contrib.</AppTableTh>
              <AppTableTh align="right">Employer contrib.</AppTableTh>
              <AppTableTh align="right">YTD total</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {loading ? (
                <AppTableTr>
                  <AppTableTd colSpan={6} align="center">
                    <span className="py-4 block text-slate-500 text-sm">Loading…</span>
                  </AppTableTd>
                </AppTableTr>
              ) : staffPension.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={6} align="center">
                    <span className="py-4 block text-slate-500 text-sm">
                      No lines. Select a payroll run with computed lines.
                    </span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                staffPension.map((s) => (
                  <AppTableTr key={s.userId}>
                    <AppTableTd>{s.name}</AppTableTd>
                    <AppTableTd>{s.pfaName}</AppTableTd>
                    <AppTableTd>
                      {s.missingRsa ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-ui-xs font-bold text-red-700">
                          Missing
                        </span>
                      ) : (
                        <span className="font-mono text-xs">{s.rsaPin}</span>
                      )}
                    </AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.empContrib)}</AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.errContrib)}</AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.ytdTotal)}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
            </div>
          </>
        )}
      </div>

      {/* Remittance history */}
      {remittanceHistory.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-ui-xs font-black uppercase tracking-widest text-slate-500">Remittance history</h3>
          <div className="space-y-2 md:hidden">
            {remittanceHistory.map((h) => (
              <article key={`${h.period}-m`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{h.period}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-ui-xs font-bold ${
                      h.status === 'Remitted' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {h.status}
                  </span>
                </div>
                <p className="mt-1 tabular-nums text-slate-700">{h.total}</p>
                <p className="mt-0.5 capitalize text-slate-500">{h.runStatus}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Period</AppTableTh>
                <AppTableTh align="right">Total contributions</AppTableTh>
                <AppTableTh>Run status</AppTableTh>
                <AppTableTh>Remittance status</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {remittanceHistory.map((h) => (
                  <AppTableTr key={h.period}>
                    <AppTableTd>{h.period}</AppTableTd>
                    <AppTableTd align="right">{h.total}</AppTableTd>
                    <AppTableTd>
                      <span className="capitalize">{h.runStatus}</span>
                    </AppTableTd>
                    <AppTableTd>
                      <span
                        className={`rounded-full px-2 py-0.5 text-ui-xs font-bold ${
                          h.status === 'Remitted'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function HrPayeTaxPension({ embedded = false } = {}) {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions || []);
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionFromUrl = embedded ? searchParams.get('section') : null;
  const initialTab = ['paye', 'pension', 'policy'].includes(sectionFromUrl) ? sectionFromUrl : 'paye';

  const [tab, setTab] = useState(initialTab);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [lines, setLines] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linesLoading, setLinesLoading] = useState(false);
  const [error, setError] = useState('');

  const setSectionTab = useCallback(
    (next) => {
      setTab(next);
      if (embedded) {
        setSearchParams((prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next === 'paye') nextParams.delete('section');
          else nextParams.set('section', next);
          return nextParams;
        });
      }
    },
    [embedded, setSearchParams]
  );

  useEffect(() => {
    if (embedded && sectionFromUrl && ['paye', 'pension', 'policy'].includes(sectionFromUrl)) {
      setTab(sectionFromUrl);
    }
  }, [embedded, sectionFromUrl]);

  // Load payroll runs and pension policy
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [runsRes, policyRes] = await Promise.all([
        apiFetch('/api/hr/payroll-runs'),
        apiFetch('/api/hr/policy-config'),
      ]);
      if (cancelled) return;
      const { ok, data } = runsRes;
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load payroll runs.');
        setLoading(false);
        return;
      }
      const list = data.runs || [];
      setRuns(list);
      setError('');
      if (policyRes.ok && policyRes.data?.ok) setPolicy(policyRes.data.policy || null);
      const latest = list.find((r) => r.status === 'paid' || r.status === 'locked') || list[0];
      if (latest) setSelectedRunId(latest.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load lines for selected run
  const loadLines = useCallback(async () => {
    if (!selectedRunId) {
      setLines([]);
      return;
    }
    setLinesLoading(true);
    const fetchFn = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
    const { ok, data } = await fetchFn(`/api/hr/payroll-runs/${encodeURIComponent(selectedRunId)}/lines`);
    setLinesLoading(false);
    if (!ok || !data?.ok) {
      setLines([]);
      return;
    }
    setLines(data.lines || []);
  }, [selectedRunId, showSensitiveInline, sensitive.isUnlocked, sensitive.fetchWithSensitive]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const latestRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        PAYE is a fixed monthly ₦ amount per staff (not a percentage). Pension uses company policy rates for eligible
        branch staff. Schedules below are derived from computed payroll runs.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {/* Run selector */}
      {runs.length > 0 ? (
        <label className="block w-full max-w-md text-xs font-semibold text-slate-600">
          Payroll run
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {formatPayrollPeriodLabel(r.periodYyyymm)} · {r.status}
              </option>
            ))}
          </select>
        </label>
      ) : loading ? (
        <p className="text-sm text-slate-600">Loading runs…</p>
      ) : (
        <p className="text-sm text-slate-600">No payroll runs found.</p>
      )}

      {/* Tabs */}
      <HrSubViewTabs
        tabs={[
          { id: 'paye', label: 'PAYE tax' },
          { id: 'pension', label: 'Pension' },
          { id: 'policy', label: 'Statutory policy' },
        ]}
        value={tab}
        onChange={setSectionTab}
        ariaLabel="PAYE and pension sections"
      />

      {tab === 'paye' ? (
        <PayeTab runs={runs} lines={lines} latestRun={latestRun} loading={loading || linesLoading} />
      ) : tab === 'pension' ? (
        <PensionTab
          runs={runs}
          lines={lines}
          latestRun={latestRun}
          loading={loading || linesLoading}
          policy={policy}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Company pension rates, statutory deductions, and payroll policy defaults used across runs.
          </p>
          <HrPolicyConfigSection />
        </div>
      )}
    </div>
  );
}
