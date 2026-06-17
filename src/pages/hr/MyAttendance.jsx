import React from 'react';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard } from '../../components/profile/profileDesign';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';

export default function MyAttendance() {
  const periodYyyymm = currentPeriodYyyymm();

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Attendance"
        description="Your branch manager records daily attendance. Corrections and exceptions are handled before payroll is locked."
      />

      <ProfileProbationBanner />

      <ProfileOverviewSection title="How it works" subtitle="What you need to know">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileKpiCard label="Current payroll month">
            <p className="font-mono text-2xl font-black tracking-tight text-[#134e4a]">{periodYyyymm}</p>
          </ProfileKpiCard>
          <ProfileKpiCard label="Who records it">
            <p className="text-sm font-semibold text-slate-900">Branch manager — daily roll</p>
          </ProfileKpiCard>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          If you were late or absent for an approved reason, your manager can endorse an attendance exception before
          payroll is locked. Contact HR if you need a correction after payroll has run.
        </p>
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
