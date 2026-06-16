import React from 'react';
import { domesticEmployerLine } from '../../lib/domesticStaffUi';

/**
 * Context banner on domestic staff payments pages.
 * @param {{ profile?: object | null }} props
 */
export function DomesticStaffContextBar({ profile }) {
  if (!profile) return null;

  const employer = profile.executiveEmployerLine || domesticEmployerLine(profile);
  const roleLine = [profile.designation, profile.workLocation].filter(Boolean).join(' · ');

  if (!employer && !roleLine) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/80 to-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        {employer ? (
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{employer}</p>
        ) : null}
        {roleLine ? <p className="mt-0.5 text-sm font-semibold text-slate-900">{roleLine}</p> : null}
        {profile.dateJoinedIso ? (
          <p className="mt-0.5 text-xs text-slate-500">Joined {profile.dateJoinedIso}</p>
        ) : null}
      </div>
      {profile.employeeNo ? (
        <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
          {profile.employeeNo}
        </span>
      ) : null}
    </div>
  );
}
