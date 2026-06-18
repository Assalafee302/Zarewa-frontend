import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrAnalyticsDashboard } from '../../lib/hrMasterData';
import { HrCard, HrPageIntro } from '../../components/hr/hrPageUi';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

/* ─── helpers ─────────────────────────────────────────────── */

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function fmtNgn(n) {
  if (n == null) return '—';
  return '₦' + Number(n).toLocaleString();
}

function pct(n, total) {
  if (!total) return '0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function AnalyticsPairTable({ columns, rows, emptyMessage = 'No data.' }) {
  if (!rows?.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }
  return (
    <AppTableWrap>
      <AppTable role="numeric">
        <AppTableThead>
          {columns.map((c) => (
            <AppTableTh key={c.key} align={c.align}>
              {c.label}
            </AppTableTh>
          ))}
        </AppTableThead>
        <AppTableBody>
          {rows.map((row) => (
            <AppTableTr key={row.key}>
              {columns.map((c) => (
                <AppTableTd key={c.key} align={c.align}>
                  {row[c.key]}
                </AppTableTd>
              ))}
            </AppTableTr>
          ))}
        </AppTableBody>
      </AppTable>
    </AppTableWrap>
  );
}

/* ─── Tab 0: Dashboard (Phase 5) ───────────────────────────── */

function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await fetchHrAnalyticsDashboard();
      setLoading(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not load HR analytics dashboard.');
        return;
      }
      setData(d.analytics);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading workforce analytics…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active headcount" value={data.headcount?.total ?? '—'} />
        <StatCard label="Hires (12 mo)" value={data.movement?.hires ?? '—'} />
        <StatCard label="Transfers (12 mo)" value={data.movement?.transfers ?? '—'} />
        <StatCard label="Training staff" value={data.compliance?.trainingRecords ?? '—'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <HrCard title="Headcount by department">
          <AnalyticsPairTable
            columns={[
              { key: 'label', label: 'Department' },
              { key: 'count', label: 'Staff', align: 'right' },
            ]}
            rows={(data.headcount?.byDepartment || []).slice(0, 10).map((r) => ({
              key: r.label,
              label: r.label,
              count: fmt(r.count),
            }))}
            emptyMessage="No department data."
          />
        </HrCard>
        <HrCard title="Headcount by branch">
          <AnalyticsPairTable
            columns={[
              { key: 'label', label: 'Branch' },
              { key: 'count', label: 'Staff', align: 'right' },
            ]}
            rows={(data.headcount?.byBranch || []).slice(0, 10).map((r) => ({
              key: r.label,
              label: r.label,
              count: fmt(r.count),
            }))}
            emptyMessage="No branch data."
          />
        </HrCard>
        <HrCard title="Leave usage by department">
          <AnalyticsPairTable
            columns={[
              { key: 'label', label: 'Department' },
              { key: 'count', label: 'Requests', align: 'right' },
            ]}
            rows={(data.leaveUsage?.byDepartment || []).slice(0, 10).map((r) => ({
              key: r.department,
              label: r.department,
              count: fmt(r.count),
            }))}
            emptyMessage="No leave usage data."
          />
        </HrCard>
      </div>
      {data.payrollTrend?.periods?.length ? (
        <HrCard title="Payroll net pay trend (authorized)">
          <AnalyticsPairTable
            columns={[
              { key: 'period', label: 'Period' },
              { key: 'net', label: 'Net pay', align: 'right' },
            ]}
            rows={data.payrollTrend.periods.map((p, i) => ({
              key: p,
              period: p,
              net: fmtNgn(data.payrollTrend.netTotals[i]),
            }))}
          />
        </HrCard>
      ) : null}
    </div>
  );
}

/* ─── Tab 1: Attendance ────────────────────────────────────── */

function AttendanceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await apiFetch('/api/hr/analytics/attendance-trends?months=6');
      setLoading(false);
      if (!ok || !d?.ok) { setError(d?.error || 'Could not load attendance trends.'); return; }
      setData(d);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading attendance trends…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!data) return null;

  const months = data.months || [];
  const absentees = data.chronicAbsentees || [];

  return (
    <div className="space-y-6">
      <HrCard title="Attendance Trends — Last 6 Months">
        {months.length === 0 ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : (
          <div className="space-y-3">
            {months.map(m => {
              const total = (m.present || 0) + (m.late || 0) + (m.absent || 0);
              const presentPct = total ? ((m.present / total) * 100).toFixed(0) : 0;
              const latePct = total ? ((m.late / total) * 100).toFixed(0) : 0;
              const absentPct = total ? ((m.absent / total) * 100).toFixed(0) : 0;
              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 w-20">{m.month}</span>
                    <span className="font-bold text-teal-700">{m.attendanceRate ?? presentPct}% present</span>
                  </div>
                  <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div style={{ width: `${presentPct}%` }} className="bg-teal-500" title={`Present: ${m.present}`} />
                    <div style={{ width: `${latePct}%` }} className="bg-amber-400" title={`Late: ${m.late}`} />
                    <div style={{ width: `${absentPct}%` }} className="bg-red-400" title={`Absent: ${m.absent}`} />
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-1" />Present: {fmt(m.present)}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Late: {fmt(m.late)}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />Absent: {fmt(m.absent)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HrCard>

      <HrCard title="Chronic Absentees (90 days)">
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff Name</AppTableTh>
              <AppTableTh>Branch</AppTableTh>
              <AppTableTh align="right">Absent Days</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {absentees.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={3} align="center">
                    <span className="text-slate-500 py-4 block">No chronic absentees.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                absentees.map((a, i) => (
                  <AppTableTr key={a.userId || i}>
                    <AppTableTd><span className="font-semibold">{a.displayName || a.userId}</span></AppTableTd>
                    <AppTableTd>{a.branch || '—'}</AppTableTd>
                    <AppTableTd align="right">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${
                        a.absentDays > 10
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {a.absentDays}
                      </span>
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </HrCard>
    </div>
  );
}

/* ─── Tab 2: Headcount ─────────────────────────────────────── */

function HeadcountTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await apiFetch('/api/hr/analytics/headcount');
      setLoading(false);
      if (!ok || !d?.ok) { setError(d?.error || 'Could not load headcount data.'); return; }
      setData(d);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading headcount…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!data) return null;

  const total = data.totalActive || 0;
  const male = data.male || 0;
  const female = data.female || 0;
  const unknown = data.unknownGender || 0;
  const byBranch = data.byBranch || [];
  const byDept = data.byDepartment || [];
  const byType = data.byEmploymentType || {};

  const typeLabels = { permanent: 'Permanent', contract: 'Contract', casual: 'Casual', intern: 'Intern' };
  const typeTones = {
    permanent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    contract: 'bg-sky-50 text-sky-800 border-sky-200',
    casual: 'bg-amber-50 text-amber-900 border-amber-200',
    intern: 'bg-violet-50 text-violet-800 border-violet-200',
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Active" value={fmt(total)} />
        <StatCard label="Male" value={fmt(male)} sub={pct(male, total)} />
        <StatCard label="Female" value={fmt(female)} sub={pct(female, total)} />
        <StatCard label="Unknown Gender" value={fmt(unknown)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(byType).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${typeTones[k] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {typeLabels[k] || k}: {fmt(v)}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrCard title="By Branch">
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Branch</AppTableTh>
                <AppTableTh align="right">Count</AppTableTh>
                <AppTableTh align="right">% of Total</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {byBranch.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={3} align="center"><span className="text-slate-500 py-3 block">No data.</span></AppTableTd>
                  </AppTableTr>
                ) : (
                  byBranch.map((b, i) => (
                    <AppTableTr key={b.branch || i}>
                      <AppTableTd>{b.branch || '—'}</AppTableTd>
                      <AppTableTd align="right">{fmt(b.count)}</AppTableTd>
                      <AppTableTd align="right">{pct(b.count, total)}</AppTableTd>
                    </AppTableTr>
                  ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </HrCard>

        <HrCard title="By Department">
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Department</AppTableTh>
                <AppTableTh align="right">Count</AppTableTh>
                <AppTableTh align="right">% of Total</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {byDept.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={3} align="center"><span className="text-slate-500 py-3 block">No data.</span></AppTableTd>
                  </AppTableTr>
                ) : (
                  byDept.map((d, i) => (
                    <AppTableTr key={d.department || i}>
                      <AppTableTd>{d.department || '—'}</AppTableTd>
                      <AppTableTd align="right">{fmt(d.count)}</AppTableTd>
                      <AppTableTd align="right">{pct(d.count, total)}</AppTableTd>
                    </AppTableTr>
                  ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </HrCard>
      </div>
    </div>
  );
}

/* ─── Tab 3: Loan Portfolio ────────────────────────────────── */

function LoanPortfolioTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await apiFetch('/api/hr/analytics/loan-portfolio');
      setLoading(false);
      if (!ok || !d?.ok) { setError(d?.error || 'Could not load loan portfolio.'); return; }
      setData(d);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading loan portfolio…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!data) return null;

  const byBranch = data.byBranch || [];
  const loans = data.loans || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active Loans" value={fmt(data.activeLoans)} />
        <StatCard label="Total Outstanding" value={fmtNgn(data.totalOutstandingNgn)} />
        <StatCard label="Monthly Deductions" value={fmtNgn(data.monthlyDeductionsNgn)} />
      </div>

      <HrCard title="By Branch">
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Branch</AppTableTh>
              <AppTableTh align="right">Active Loans</AppTableTh>
              <AppTableTh align="right">Total Exposure</AppTableTh>
              <AppTableTh align="right">Monthly Deductions</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {byBranch.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={4} align="center"><span className="text-slate-500 py-3 block">No data.</span></AppTableTd>
                </AppTableTr>
              ) : (
                byBranch.map((b, i) => (
                  <AppTableTr key={b.branch || i}>
                    <AppTableTd>{b.branch || '—'}</AppTableTd>
                    <AppTableTd align="right">{fmt(b.activeLoans)}</AppTableTd>
                    <AppTableTd align="right">{fmtNgn(b.totalExposureNgn)}</AppTableTd>
                    <AppTableTd align="right">{fmtNgn(b.monthlyDeductionsNgn)}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </HrCard>

      <HrCard title="All Active Loans">
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Branch</AppTableTh>
              <AppTableTh align="right">Amount</AppTableTh>
              <AppTableTh align="right">Monthly</AppTableTh>
              <AppTableTh>Status</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {loans.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={5} align="center"><span className="text-slate-500 py-3 block">No active loans.</span></AppTableTd>
                </AppTableTr>
              ) : (
                loans.map((l, i) => (
                  <AppTableTr key={l.id || i}>
                    <AppTableTd><span className="font-semibold">{l.displayName || l.userId}</span></AppTableTd>
                    <AppTableTd>{l.branch || '—'}</AppTableTd>
                    <AppTableTd align="right">{fmtNgn(l.amountNgn)}</AppTableTd>
                    <AppTableTd align="right">{fmtNgn(l.monthlyDeductionNgn)}</AppTableTd>
                    <AppTableTd>
                      <HrStatusBadge status={l.status || 'active'} variant="benefit" />
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </HrCard>
    </div>
  );
}

/* ─── Tab 4: Turnover ──────────────────────────────────────── */

function TurnoverTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await apiFetch('/api/hr/analytics/turnover-trend?months=12');
      setLoading(false);
      if (!ok || !d?.ok) { setError(d?.error || 'Could not load turnover data.'); return; }
      setData(d);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading turnover trends…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!data) return null;

  const months = data.months || [];
  const maxVal = Math.max(...months.map(m => Math.max(m.joiners || 0, m.leavers || 0, 1)));
  const totalJoiners = months.reduce((a, m) => a + (m.joiners || 0), 0);
  const totalLeavers = months.reduce((a, m) => a + (m.leavers || 0), 0);
  const netChange = totalJoiners - totalLeavers;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Joiners YTD" value={fmt(totalJoiners)} />
        <StatCard label="Total Leavers YTD" value={fmt(totalLeavers)} />
        <StatCard
          label="Net Change"
          value={
            <span className={netChange >= 0 ? 'text-emerald-700' : 'text-red-700'}>
              {netChange >= 0 ? '+' : ''}{fmt(netChange)}
            </span>
          }
        />
      </div>

      <HrCard title="Monthly Joiners vs Leavers — Last 12 Months">
        {months.length === 0 ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : (
          <div className="space-y-3">
            {months.map(m => {
              const joinerPct = ((m.joiners || 0) / maxVal) * 100;
              const leaverPct = ((m.leavers || 0) / maxVal) * 100;
              const net = (m.joiners || 0) - (m.leavers || 0);
              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 w-20">{m.month}</span>
                    <span className={`font-bold text-xs ${net >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                      {net >= 0 ? '+' : ''}{net}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-14 text-right text-xs text-slate-500">Joiners</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${joinerPct}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                      <span className="w-5 text-xs font-bold text-emerald-700">{m.joiners || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-14 text-right text-xs text-slate-500">Leavers</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${leaverPct}%` }} className="h-full bg-red-400 rounded-full" />
                      </div>
                      <span className="w-5 text-xs font-bold text-red-700">{m.leavers || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HrCard>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */

const TABS = [
  { key: 'dashboard', label: 'Overview' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'headcount', label: 'Headcount' },
  { key: 'loans', label: 'Loans' },
  { key: 'turnover', label: 'Turnover' },
];

export default function HrAnalytics() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <HrPageIntro
        title="HR Analytics"
        description="Workforce insights — attendance trends, headcount breakdown, loan portfolio, and turnover."
        actions={
          <Link
            to="/hr/documents?tab=reports"
            className="rounded-xl border border-[#134e4a]/30 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50 no-underline"
          >
            Full reports &amp; export →
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === t.key ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'headcount' && <HeadcountTab />}
      {tab === 'loans' && <LoanPortfolioTab />}
      {tab === 'turnover' && <TurnoverTab />}
    </div>
  );
}
