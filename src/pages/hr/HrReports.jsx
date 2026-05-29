import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { downloadHrReportExport, fetchHrReportsSummary } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { HrAlert, HrCard, HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';

const EXPORT_KINDS = [
  { kind: 'headcount', label: 'Headcount', desc: 'All staff with branch and manager' },
  { kind: 'turnover', label: 'Turnover', desc: 'Separations and exit details' },
  { kind: 'training-expiry', label: 'Training expiry', desc: 'Certifications due to lapse' },
  { kind: 'engagement-trends', label: 'Engagement', desc: 'Survey ratings summary' },
];

function Stat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-100',
    amber: 'border-amber-100 bg-amber-50/30',
    red: 'border-red-100 bg-red-50/30',
  };
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function HrReports({ executive = false }) {
  const [summary, setSummary] = useState(null);
  const [exportErr, setExportErr] = useState('');
  const [exportBusy, setExportBusy] = useState('');

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
  if (error) return <HrAlert>{error}</HrAlert>;
  if (!summary) return null;

  const inbox = summary.inbox || {};

  const runExport = async (kind) => {
    setExportBusy(kind);
    setExportErr('');
    const r = await downloadHrReportExport(kind);
    setExportBusy('');
    if (!r.ok) setExportErr(r.error || 'Export failed.');
  };

  return (
    <HrPageBody>
      <HrPageIntro
        title={executive ? 'Executive HR reports' : 'HR reports'}
        description={
          executive
            ? 'Executive snapshot of people operations, payroll status, and approval queues.'
            : 'Operational metrics, payroll status, and downloadable data extracts for HQ reporting.'
        }
      />

      <HrCard title="Data exports" subtitle="Download CSV files for audit, compliance, and management review">
        {exportErr ? (
          <div className="mb-3">
            <HrAlert>{exportErr}</HrAlert>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {EXPORT_KINDS.map(({ kind, label, desc }) => (
            <div key={kind} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(exportBusy)}
                onClick={() => void runExport(kind)}
                className={`${HR_BTN_SECONDARY} inline-flex shrink-0 items-center gap-1.5 !px-3 !py-2`}
              >
                <Download className="h-3.5 w-3.5" />
                {exportBusy === kind ? '…' : 'CSV'}
              </button>
            </div>
          ))}
        </div>
      </HrCard>

      <HrCard title="Key metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active staff" value={summary.staffActive ?? 0} />
          <Stat label="Incomplete profiles" value={summary.staffIncomplete ?? 0} tone={Number(summary.staffIncomplete) > 0 ? 'amber' : 'slate'} />
          <Stat label="Open incidents" value={summary.openIncidents ?? 0} tone={Number(summary.openIncidents) > 0 ? 'red' : 'slate'} />
          <Stat label="Beneficiaries" value={summary.beneficiaries ?? 0} />
          <Stat label="HR review queue" value={inbox.pendingHrReview ?? 0} tone={Number(inbox.pendingHrReview) > 0 ? 'amber' : 'slate'} />
          <Stat label="GM HR queue" value={inbox.pendingGmHrReview ?? 0} />
          <Stat label="Overdue requests" value={inbox.overdueRequests ?? 0} tone={Number(inbox.overdueRequests) > 0 ? 'red' : 'slate'} />
          <Stat label="Branch endorsements" value={inbox.pendingBranchEndorse ?? 0} />
        </div>
      </HrCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrCard title="Payroll runs by status">
          <ul className="space-y-2 text-sm text-slate-700">
            {Object.entries(summary.payrollRunsByStatus || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <span className="font-medium capitalize">{k}</span>
                <span className="tabular-nums font-semibold">{v}</span>
              </li>
            ))}
          </ul>
          <Link to="/hr/payroll" className="mt-4 inline-block text-sm font-bold text-[#134e4a] hover:underline">
            Open payroll →
          </Link>
        </HrCard>

        <HrCard title="Recent salary changes" subtitle="Latest adjustments across the organisation">
          <ul className="divide-y divide-slate-100 text-sm max-h-80 overflow-y-auto">
            {(summary.recentSalaryChanges || []).length === 0 ? (
              <li className="py-4 text-center text-slate-500">No recent changes.</li>
            ) : (
              (summary.recentSalaryChanges || []).map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                  <span>
                    <Link to={`/hr/staff/${c.userId}`} className="font-semibold text-[#134e4a] hover:underline">
                      {c.displayName}
                    </Link>
                    <span className="text-slate-500"> — {c.reason || '—'}</span>
                  </span>
                  <span className="tabular-nums text-xs text-slate-600 sm:text-sm">
                    {c.baseSalaryNgn != null ? formatNgn(c.baseSalaryNgn) : '—'} · {c.effectiveFromIso}
                  </span>
                </li>
              ))
            )}
          </ul>
        </HrCard>
      </div>
    </HrPageBody>
  );
}
