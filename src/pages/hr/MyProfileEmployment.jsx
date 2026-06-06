import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { HrCard } from '../../components/hr/hrPageUi';

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value || '—'}</dd>
    </div>
  );
}

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
    return () => { cancelled = true; };
  }, [showSensitive, sensitive.isUnlocked, sensitive.fetchWithSensitive]);

  if (loading) return <p className="text-sm text-slate-600">Loading employment details…</p>;
  const hr = profile?.hr;
  const user = profile?.user;
  if (!hr) return <p className="text-sm text-slate-600">No HR employment file on record yet.</p>;

  const nok = hr.nextOfKin
    ? [hr.nextOfKin.name, hr.nextOfKin.phone, hr.nextOfKin.relationship].filter(Boolean).join(' · ')
    : '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Your employment record for {user?.displayName}. Contact HR to update official records.</p>

      <HrCard title="Personal details">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <DetailRow label="Employee number" value={hr.employeeNo} />
          <DetailRow label="NIN" value={hr.ninNumber} />
          <DetailRow label="Next of kin" value={nok} />
        </dl>
      </HrCard>

      <HrCard title="Employment">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <DetailRow label="Job title" value={hr.jobTitle} />
          <DetailRow label="Department" value={hr.department} />
          <DetailRow label="Branch" value={hr.branchId} />
          <DetailRow label="Employment type" value={hr.employmentType} />
          <DetailRow label="Date joined" value={hr.dateJoinedIso} />
          <DetailRow label="Probation ends" value={hr.probationEndIso} />
          <DetailRow label="Line manager" value={hr.lineManagerDisplayName || hr.lineManagerUserId} />
        </dl>
      </HrCard>

      <HrCard title="Compensation & payroll">
        {hr.compensationRedacted ? (
          <p className="text-sm text-slate-500">Unlock sensitive data on Overview to view salary details.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <DetailRow label="Payroll group" value={hr.payrollGroup} />
            <DetailRow label="Level / step" value={hr.salaryLevel != null ? `${hr.salaryLevel} / ${hr.salaryStep ?? 1}` : '—'} />
            <DetailRow label="Base salary" value={hr.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'} />
          </dl>
        )}
      </HrCard>
    </div>
  );
}
