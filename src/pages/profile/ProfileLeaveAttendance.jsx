import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import MyLeave from '../hr/MyLeave';
import MyAttendance from '../hr/MyAttendance';

export default function ProfileLeaveAttendance() {
  const { cohort } = useUserProfile();
  const showAttendance = cohort === 'employee';

  return (
    <div className="space-y-8">
      <section>
        {!showAttendance ? (
          <header className="mb-4">
            <h3 className="text-sm font-black text-slate-900">Leave</h3>
            <p className="mt-1 text-xs text-slate-500">Apply for leave and track your requests.</p>
          </header>
        ) : null}
        <MyLeave staffLinkBase="/me" embedded />
      </section>

      {showAttendance ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <header className="mb-4">
            <h3 className="text-sm font-black text-slate-900">Attendance</h3>
            <p className="mt-1 text-xs text-slate-500">How your attendance is recorded and what to do if something is wrong.</p>
          </header>
          <MyAttendance />
        </section>
      ) : null}
    </div>
  );
}
