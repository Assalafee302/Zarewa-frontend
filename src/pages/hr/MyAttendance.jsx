import React from 'react';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function MyAttendance() {
  const periodYyyymm = currentPeriodYyyymm();

  return (
    <HrPageBody>
      <HrPageIntro
        title="Attendance"
        description="Your branch manager records daily attendance. Corrections and exceptions are handled before payroll is locked."
      />

      <ProfileOverviewSection title="How it works" subtitle="What you need to know">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current payroll month</dt>
            <dd className="mt-1 font-mono text-lg font-black text-[#134e4a]">{periodYyyymm}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Who records it</dt>
            <dd className="mt-1 font-semibold text-slate-900">Branch manager — daily roll</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          If you were late or absent for an approved reason, your manager can endorse an attendance exception before
          payroll is locked. Contact HR if you need a correction after payroll has run.
        </p>
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
