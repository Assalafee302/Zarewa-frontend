import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HrSensitiveField } from '../../components/hr/HrSensitiveField';
import ProfileOnboardingForm from '../../components/profile/ProfileOnboardingForm';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';
import { ProfileOnboardingWizard } from '../../components/profile/ProfileOnboardingWizard';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileModuleSection } from '../../components/profile/profileDesign';
import { composeLegalDisplayName } from '../../lib/hrLegalDisplayName';

function DetailRow({ label, value }) {
  return (
    <div className="z-list-row-compact">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export function MyProfileEmploymentSnapshot() {
  const { hr, initialLoading } = useUserProfile();

  if (initialLoading) return <ProfileMetricSkeleton count={2} />;
  if (!hr) {
    return (
      <ProfileInlineAlert variant="warning">
        No HR employment file on record yet. Contact HR, then complete the form above.
      </ProfileInlineAlert>
    );
  }

  const personal = hr.profileExtra?.personal || {};
  const legalName = composeLegalDisplayName(personal) || hr.legalDisplayName;
  const nok = hr.nextOfKin
    ? [hr.nextOfKin.name, hr.nextOfKin.phone, hr.nextOfKin.relationship].filter(Boolean).join(' · ')
    : '—';

  return (
    <div className="space-y-4">
      <ProfileModuleSection title="Personal record">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Full legal name" value={legalName} />
          <DetailRow label="Employee number" value={hr.employeeNo} />
          <DetailRow label="Phone" value={personal.phone} />
          <DetailRow label="Personal email" value={personal.email} />
          <DetailRow label="Gender" value={hr.gender} />
          <DetailRow label="Date of birth" value={hr.dateOfBirthIso} />
          <DetailRow label="NIN" value={hr.ninNumber} />
          <DetailRow label="BVN" value={hr.bvnNumber} />
          <DetailRow label="Address" value={personal.residentialAddress} />
          <DetailRow label="Next of kin" value={nok} />
          <DetailRow label="Qualification" value={hr.minimumQualification || hr.academicQualification} />
        </dl>
      </ProfileModuleSection>

      <ProfileModuleSection title="Employment (HR maintained)">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Job title" value={hr.jobTitle} />
          <DetailRow label="Department" value={hr.department} />
          <DetailRow label="Branch" value={hr.branchId} />
          <DetailRow label="Employment type" value={hr.employmentType} />
          <DetailRow label="Date joined" value={hr.dateJoinedIso} />
          <DetailRow label="Probation ends" value={hr.probationEndIso} />
          <DetailRow label="Line manager" value={hr.lineManagerDisplayName || hr.lineManagerUserId} />
        </dl>
      </ProfileModuleSection>

      <ProfileModuleSection title="Compensation & payroll">
        {hr.compensationRedacted ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <HrSensitiveField label="Base salary (monthly)" redacted />
            <HrSensitiveField label="Bank" redacted />
          </dl>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </ProfileModuleSection>
    </div>
  );
}

export default function MyProfileEmployment() {
  const { hr } = useUserProfile();
  const profileLocked = Boolean(hr?.profileLocked);

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Employment record"
        description={
          profileLocked
            ? 'Your profile is on file. View your record below or request HR to update locked fields.'
            : 'Complete your personal details, save progress, then submit for HR review. Job title, salary, and org structure are maintained by HR.'
        }
      />

      <ProfileOnboardingWizard />
      <ProfileProbationBanner />

      <ProfileOverviewSection
        title={profileLocked ? 'Your submitted record' : 'Complete your profile'}
        subtitle={profileLocked ? 'Read-only view of your HR file' : 'All sections on one scrollable form'}
      >
        <ProfileOnboardingForm />
      </ProfileOverviewSection>

      {profileLocked ? (
        <ProfileOverviewSection
          title="Request an update"
          subtitle="Changes to NIN, BVN, bank, or next of kin need HR approval"
        >
          <ProfileHrUpdateForm />
        </ProfileOverviewSection>
      ) : null}

      <ProfileOverviewSection title="Full record" subtitle="Personal and employment data on file">
        <MyProfileEmploymentSnapshot />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
