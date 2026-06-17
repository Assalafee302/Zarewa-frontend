import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HrCard, HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileSelfServiceForm } from '../../components/profile/ProfileSelfServiceForm';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';
import { HrSensitiveField } from '../../components/hr/HrSensitiveField';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfilePageAnchors } from '../../components/profile/profileFormUi';

const EMPLOYMENT_ANCHORS = [
  { id: 'personal-update', label: 'Personal' },
  { id: 'hr-request', label: 'HR request' },
  { id: 'snapshot', label: 'Record' },
];

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

  if (initialLoading) return <ProfileMetricSkeleton count={2} />;
  if (!hr) {
    return (
      <ProfileInlineAlert variant="warning">
        No HR employment file on record yet. Contact HR, then complete the forms above.
      </ProfileInlineAlert>
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
          <DetailRow label="BVN" value={hr.bvnNumber} />
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
    <HrPageBody>
      <HrPageIntro
        title="Employment record"
        description="Update personal details yourself. Job title, salary, and bank changes go through HR approval — use the request form for NIN, BVN, next of kin, or bank updates."
      />

      <ProfilePageAnchors items={EMPLOYMENT_ANCHORS} />

      <ProfileOverviewSection
        id="personal-update"
        title="Update personal details"
        subtitle="Phone, qualification, and other self-service fields"
      >
        <ProfileSelfServiceForm />
      </ProfileOverviewSection>

      <ProfileOverviewSection
        id="hr-request"
        title="Request HR update"
        subtitle="NIN, BVN, next of kin, bank account, and other changes that need approval"
      >
        <ProfileHrUpdateForm />
      </ProfileOverviewSection>

      <ProfileOverviewSection id="snapshot" title="Your record" subtitle="Official employment data maintained by HR">
        <MyProfileEmploymentSnapshot />
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
