import React from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrReportsSummary } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';

function downloadJson2Csv(filename, data, columns) {
  const headers = columns.map(c => c.label);
  const rows = data.map(row => columns.map(c => `"${row[c.key] ?? ''}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
    </div>
  );
}

export default function HrReports({ executive = false }) {
  const [summary, setSummary] = React.useState(null);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrReportsSummary();
    if (!ok || !data?.ok) {
      setSummary(null);
      return { error: data?.error || 'Could not load reports.', hasData: false };
    }
    setSummary(data.summary);
    return { hasData: true };
  }, []);

  if (loading && !summary) return <p className="text-sm text-slate-600">Loading HR reports…</p>;
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  if (!summary) return null;

  const inbox = summary.inbox || {};

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        {executive
          ? 'Executive snapshot of people operations, payroll status, and approval queues.'
          : 'HQ HR operational metrics — staff quality, payroll runs, and pending approvals.'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active staff" value={summary.staffActive ?? 0} />
        <Stat label="Incomplete profiles" value={summary.staffIncomplete ?? 0} />
        <Stat label="Beneficiaries" value={summary.beneficiaries ?? 0} />
        <Stat label="Open incidents" value={summary.openIncidents ?? 0} />
        <Stat label="HR review queue" value={inbox.pendingHrReview ?? 0} />
        <Stat label="GM HR queue" value={inbox.pendingGmHrReview ?? 0} />
        <Stat label="Overdue requests" value={inbox.overdueRequests ?? 0} />
        <Stat label="Branch endorsements" value={inbox.pendingBranchEndorse ?? 0} />
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Payroll runs by status</h3>
        <ul className="text-sm text-slate-700 space-y-1">
          {Object.entries(summary.payrollRunsByStatus || {}).map(([k, v]) => (
            <li key={k}>
              <span className="font-semibold capitalize">{k}</span>: {v}
            </li>
          ))}
        </ul>
        <Link to="/hr/payroll" className="mt-2 inline-block text-sm font-bold text-[#134e4a] hover:underline">
          Open payroll →
        </Link>
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Analytics Exports</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const { ok, data } = await apiFetch('/api/hr/analytics/headcount');
              if (!ok || !data?.ok) return;
              const rows = (data.byBranch || []).map(b => ({
                branch: b.branch,
                count: b.count,
                pct: data.totalActive ? ((b.count / data.totalActive) * 100).toFixed(1) + '%' : '—',
              }));
              downloadJson2Csv('headcount-report.csv', rows, [
                { key: 'branch', label: 'Branch' },
                { key: 'count', label: 'Count' },
                { key: 'pct', label: '% of Total' },
              ]);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] hover:bg-slate-50"
          >
            Headcount Report (CSV)
          </button>
          <a
            href="/api/hr/analytics/attendance-trends"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] hover:bg-slate-50 inline-flex items-center"
          >
            Attendance Trend
          </a>
          <button
            type="button"
            onClick={async () => {
              const { ok, data } = await apiFetch('/api/hr/analytics/loan-portfolio');
              if (!ok || !data?.ok) return;
              downloadJson2Csv('loan-portfolio.csv', data.loans || [], [
                { key: 'displayName', label: 'Staff' },
                { key: 'branch', label: 'Branch' },
                { key: 'amountNgn', label: 'Amount (NGN)' },
                { key: 'monthlyDeductionNgn', label: 'Monthly Deduction (NGN)' },
                { key: 'status', label: 'Status' },
              ]);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-[#134e4a] hover:bg-slate-50"
          >
            Loan Portfolio (CSV)
          </button>
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Recent salary changes</h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-sm">
          {(summary.recentSalaryChanges || []).map((c) => (
            <li key={c.id} className="flex justify-between gap-4 px-4 py-2">
              <span>
                <Link to={`/hr/staff/${c.userId}`} className="font-semibold text-[#134e4a] hover:underline">
                  {c.displayName}
                </Link>
                <span className="text-slate-500"> — {c.reason || '—'}</span>
              </span>
              <span className="tabular-nums text-slate-700">
                {c.baseSalaryNgn != null ? formatNgn(c.baseSalaryNgn) : '—'} · {c.effectiveFromIso}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
