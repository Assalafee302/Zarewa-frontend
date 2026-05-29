import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';

export default function MyProfileEmployment() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitive = canViewOrgSensitiveHr(ws?.permissions);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetcher = showSensitive || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
      const { ok, data } = await fetcher('/api/hr/me');
      if (!cancelled) {
        if (ok && data?.ok) setProfile(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showSensitive, sensitive.isUnlocked, sensitive.fetchWithSensitive]);

  if (loading) return <p className="text-sm text-slate-600">Loading…</p>;
  const hr = profile?.hr;
  const user = profile?.user;
  if (!hr) return <p className="text-sm text-slate-600">No HR employment file on record yet.</p>;

  const rows = [
    ['Employee no.', hr.employeeNo],
    ['Job title', hr.jobTitle],
    ['Department', hr.department],
    ['Branch', hr.branchId],
    ['Employment type', hr.employmentType],
    ['Date joined', hr.dateJoinedIso],
    ['Probation ends', hr.probationEndIso],
    ['Payroll group', hr.payrollGroup],
    ['Level / step', hr.salaryLevel != null ? `${hr.salaryLevel} / ${hr.salaryStep ?? 1}` : '—'],
    ['Base salary', hr.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'],
    ['Line manager', hr.lineManagerUserId || '—'],
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Read-only employment details for {user?.displayName}.</p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
