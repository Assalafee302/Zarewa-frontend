import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

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

// ── Nigerian PAYE computation (graduated relief already embedded in gross→taxable) ──
const PAYE_BRACKETS = [
  { limit: 300_000, rate: 0.07, label: '7%' },
  { limit: 300_000, rate: 0.11, label: '11%' },
  { limit: 500_000, rate: 0.15, label: '15%' },
  { limit: 500_000, rate: 0.19, label: '19%' },
  { limit: Infinity, rate: 0.21, label: '21%' },
];

function computePaye(annualTaxableIncome) {
  const income = Math.max(0, annualTaxableIncome);
  let remaining = income;
  let totalPaye = 0;
  const breakdown = PAYE_BRACKETS.map(({ limit, rate, label }) => {
    const taxable = Math.min(remaining, limit === Infinity ? remaining : limit);
    const tax = taxable * rate;
    remaining = Math.max(0, remaining - taxable);
    totalPaye += tax;
    return { label, rate: `${Math.round(rate * 100)}%`, taxableAmount: taxable, tax };
  });
  return { totalPaye, breakdown };
}

// Derive monthly taxable income from gross (CRA: 20% gross + ₦200k or 1% gross whichever higher)
function monthlyTaxable(grossMonthlyNgn) {
  const annual = grossMonthlyNgn * 12;
  const craFlat = Math.max(0.01 * annual, 200_000);
  const craPct = 0.2 * annual;
  const cra = craFlat + craPct;
  const taxable = Math.max(0, annual - cra);
  return taxable / 12;
}

// ── Shared stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p> : null}
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
            <rect x={x} y={y} width={barW} height={h} rx={4} fill="#134e4a" opacity={0.8} />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#64748b">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#134e4a">
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
  // Per-staff PAYE
  const staffPaye = useMemo(() => {
    return lines.map((l) => {
      const gross = Number(l.grossNgn) || 0;
      const taxableMonthly = monthlyTaxable(gross);
      const { totalPaye } = computePaye(taxableMonthly * 12);
      const monthlyPaye = totalPaye / 12;
      const effectiveRate = gross > 0 ? (monthlyPaye / gross) * 100 : 0;
      return {
        name: l.displayName || l.userId,
        userId: l.userId,
        gross,
        taxableIncome: taxableMonthly,
        payeAmount: monthlyPaye,
        effectiveRate,
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
        label: formatPeriodYyyymm(r.periodYyyymm).slice(2),
        value: Number(r.payeTotalNgn) || 0,
      }));
  }, [runs]);

  // Bracket breakdown aggregate
  const bracketBreakdown = useMemo(() => {
    const totals = PAYE_BRACKETS.map((b) => ({ ...b, totalTax: 0, totalTaxable: 0 }));
    staffPaye.forEach((s) => {
      if (s.amountsRedacted) return;
      const { breakdown } = computePaye(s.taxableIncome * 12);
      breakdown.forEach((b, i) => {
        totals[i].totalTax += b.tax / 12;
        totals[i].totalTaxable += b.taxableAmount / 12;
      });
    });
    return totals;
  }, [staffPaye]);

  // Filing history from runs
  const filingHistory = useMemo(
    () =>
      runs
        .filter((r) => r.status === 'paid' || r.status === 'locked')
        .slice(-12)
        .reverse()
        .map((r) => ({
          period: formatPeriodYyyymm(r.periodYyyymm),
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
    const headers = ['employee_name', 'gross_monthly', 'taxable_monthly', 'paye_monthly', 'effective_rate_pct'];
    const rows = staffPaye
      .filter((s) => !s.amountsRedacted)
      .map((s) => ({
        employee_name: s.name,
        gross_monthly: Math.round(s.gross),
        taxable_monthly: Math.round(s.taxableIncome),
        paye_monthly: Math.round(s.payeAmount),
        effective_rate_pct: s.effectiveRate.toFixed(2),
      }));
    const period = latestRun ? formatPeriodYyyymm(latestRun.periodYyyymm) : 'current';
    downloadCsv(`FIRS-PAYE-Schedule-${period}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current PAYE rate"
          value={latestRun?.taxPercent != null ? `${latestRun.taxPercent}%` : '—'}
          sub="Flat rate (payroll setting)"
        />
        <StatCard
          label="This month PAYE"
          value={loading ? '…' : formatNgn(totalPaye)}
          sub={latestRun ? formatPeriodYyyymm(latestRun.periodYyyymm) : ''}
        />
        <StatCard label="YTD remitted" value={loading ? '…' : formatNgn(ytd)} sub={`${new Date().getFullYear()}`} />
        <StatCard
          label="Filing status"
          value={latestRun?.payeFiled ? 'Filed' : 'Pending'}
          sub={latestRun?.status || '—'}
        />
      </div>

      {/* Bracket breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Tax computation breakdown (graduated relief, latest run)
        </h3>
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Bracket</AppTableTh>
              <AppTableTh>Rate</AppTableTh>
              <AppTableTh align="right">Taxable (monthly)</AppTableTh>
              <AppTableTh align="right">Tax (monthly)</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {bracketBreakdown.map((b, i) => (
                <AppTableTr key={i}>
                  <AppTableTd>
                    {i === 0
                      ? 'First ₦300k p.a.'
                      : i === 1
                        ? 'Next ₦300k p.a.'
                        : i === 2
                          ? 'Next ₦500k p.a.'
                          : i === 3
                            ? 'Next ₦500k p.a.'
                            : 'Balance'}
                  </AppTableTd>
                  <AppTableTd>{b.label}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(b.totalTaxable)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(b.totalTax)}</AppTableTd>
                </AppTableTr>
              ))}
              <AppTableTr>
                <AppTableTd colSpan={3}>
                  <strong>Total PAYE</strong>
                </AppTableTd>
                <AppTableTd align="right">
                  <strong>{formatNgn(totalPaye)}</strong>
                </AppTableTd>
              </AppTableTr>
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </div>

      {/* Per-staff table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Per-staff PAYE</h3>
          <button
            type="button"
            onClick={exportFirs}
            className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase text-white"
          >
            Export FIRS Schedule
          </button>
        </div>
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh align="right">Gross (monthly)</AppTableTh>
              <AppTableTh align="right">Taxable income</AppTableTh>
              <AppTableTh align="right">PAYE (monthly)</AppTableTh>
              <AppTableTh align="right">Effective rate</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {loading ? (
                <AppTableTr>
                  <AppTableTd colSpan={5} align="center">
                    <span className="py-4 block text-slate-500 text-sm">Loading…</span>
                  </AppTableTd>
                </AppTableTr>
              ) : staffPaye.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={5} align="center">
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
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.taxableIncome)}</AppTableTd>
                    <AppTableTd align="right">{s.amountsRedacted ? '—' : formatNgn(s.payeAmount)}</AppTableTd>
                    <AppTableTd align="right">
                      {s.amountsRedacted ? '—' : `${s.effectiveRate.toFixed(1)}%`}
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </div>

      {/* Monthly trend */}
      {trendData.some((d) => d.value > 0) ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
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
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Filing history</h3>
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PENSION TAB
// ════════════════════════════════════════════════════════════════════════════════
const EMP_RATE = 0.08;
const ERR_RATE = 0.10;

function PensionTab({ runs, lines, latestRun, loading }) {
  const staffPension = useMemo(() => {
    return lines.map((l) => {
      const gross = Number(l.grossNgn) || 0;
      const empContrib = gross * EMP_RATE;
      const errContrib = gross * ERR_RATE;
      return {
        name: l.displayName || l.userId,
        userId: l.userId,
        pfaName: l.pfaName || '—',
        rsaPin: l.pensionRsaPin || '—',
        gross,
        empContrib,
        errContrib,
        ytdTotal: empContrib + errContrib, // single-month proxy; real YTD would need full history
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
          period: formatPeriodYyyymm(r.periodYyyymm),
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
    const period = latestRun ? formatPeriodYyyymm(latestRun.periodYyyymm) : 'current';
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
        <StatCard label="Employee rate" value={`${EMP_RATE * 100}%`} sub="Of monthly gross" />
        <StatCard label="Employer rate" value={`${ERR_RATE * 100}%`} sub="Of monthly gross" />
        <StatCard
          label="This month total"
          value={loading ? '…' : formatNgn(totalMonth)}
          sub={`Emp: ${formatNgn(totalEmp)} + Err: ${formatNgn(totalErr)}`}
        />
        <StatCard label="YTD remitted" value={loading ? '…' : formatNgn(ytd)} sub={`${new Date().getFullYear()}`} />
      </div>

      {/* Contribution breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Contribution computation (latest run)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff count</p>
            <p className="mt-1 text-xl font-black">{staffPension.length}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee contributions</p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNgn(totalEmp)}</p>
            <p className="text-[10px] text-slate-500">8% × gross</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employer contributions</p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNgn(totalErr)}</p>
            <p className="text-[10px] text-slate-500">10% × gross</p>
          </div>
        </div>
      </div>

      {/* Per-staff RSA table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Per-staff RSA contributions</h3>
          <button
            type="button"
            onClick={exportPfa}
            className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase text-white"
          >
            Export PFA Schedule
          </button>
        </div>
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
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
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

      {/* Remittance history */}
      {remittanceHistory.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Remittance history</h3>
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function HrPayeTaxPension() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions || []);

  const [tab, setTab] = useState('paye');
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linesLoading, setLinesLoading] = useState(false);
  const [error, setError] = useState('');

  // Load payroll runs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/payroll-runs');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load payroll runs.');
        setLoading(false);
        return;
      }
      const list = data.runs || [];
      setRuns(list);
      setError('');
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
        PAYE tax schedules for FIRS filing and pension contribution summaries for PFA remittance. Derived from locked
        payroll runs.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {/* Run selector */}
      {runs.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Payroll run
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="mt-1 block w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatPeriodYyyymm(r.periodYyyymm)} · {r.status}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-600">Loading runs…</p>
      ) : (
        <p className="text-sm text-slate-600">No payroll runs found.</p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {[
          { key: 'paye', label: 'PAYE Tax' },
          { key: 'pension', label: 'Pension' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-4 py-2 text-xs font-bold uppercase ${
              tab === t.key ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'paye' ? (
        <PayeTab runs={runs} lines={lines} latestRun={latestRun} loading={loading || linesLoading} />
      ) : (
        <PensionTab runs={runs} lines={lines} latestRun={latestRun} loading={loading || linesLoading} />
      )}
    </div>
  );
}
