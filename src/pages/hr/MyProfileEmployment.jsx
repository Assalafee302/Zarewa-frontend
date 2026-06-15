import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HrCard } from '../../components/hr/hrPageUi';
import { ProfileSelfServiceForm } from '../../components/profile/ProfileSelfServiceForm';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';
import { HrSensitiveField } from '../../components/hr/HrSensitiveField';

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export function MyProfileEmploymentSnapshot() {
  const { hr, initialLoading } = useUserProfile();

  if (initialLoading) return <p className="text-sm text-slate-600">Loading employment details…</p>;
  if (!hr) {
    return (
      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No HR employment file on record yet. Contact HR, then complete the form above.
      </p>
    );
  }

  const personal = hr.profileExtra?.personal || {};
  const nok = hr.nextOfKin
    ? [hr.nextOfKin.name, hr.nextOfKin.phone, hr.nextOfKin.relationship].filter(Boolean).join(' · ')
    : '—';

  return (
    <div className="space-y-4">
      <HrCard title="Personal snapshot">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <DetailRow label="Employee number" value={hr.employeeNo} />
          <DetailRow label="Phone" value={personal.phone} />
          <DetailRow label="NIN" value={hr.ninNumber} />
          <DetailRow label="Next of kin" value={nok} />
          <DetailRow label="Qualification" value={hr.minimumQualification || hr.academicQualification} />
        </dl>
      </HrCard>

      <HrCard title="Employment (HR maintained)">
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
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <HrSensitiveField label="Base salary (monthly)" redacted />
            <HrSensitiveField label="Bank" redacted />
          </dl>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <DetailRow label="Payroll group" value={hr.payrollGroup} />
            <DetailRow
              label="Level / step"
              value={hr.salaryLevel != null ? `${hr.salaryLevel} / ${hr.salaryStep ?? 1}` : '—'}
            />
            <DetailRow label="Base salary" value={hr.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'} />
            <DetailRow
              label="Bank"
              value={[hr.bankName, hr.bankAccountName, hr.bankAccountNoMasked].filter(Boolean).join(' · ')}
            />
          </dl>
        )}
      </HrCard>
    </div>
  );
}

export default function MyProfileEmployment() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Update personal and qualification details below. Official job title, salary, and bank changes require HR
        approval — use the request form for NIN, next of kin, or bank updates.
      </p>
      <ProfileSelfServiceForm />
      <div id="hr-update-request">
        <ProfileHrUpdateForm />
      </div>
      <MyProfileEmploymentSnapshot />
    </div>
  );
}
