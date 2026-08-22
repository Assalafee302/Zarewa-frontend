import React from 'react';
import { familyParentLine } from '../../lib/familyBenefitsUi';

/**
 * Compact banner on payments/requests — family office context, not a benefits portal.
 * @param {{ profile?: object | null }} props
 */
export function FamilyBenefitsContextBar({ profile }) {
  if (!profile) return null;

  const parent = profile.familyParentLine || familyParentLine(profile);
  const schoolLine = [profile.schoolName, profile.classLevel].filter(Boolean).join(' · ');
  const sessionLine = [profile.currentTerm, profile.academicSession].filter(Boolean).join(' · ');

  if (!parent && !schoolLine) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        {parent ? <p className="text-ui-xs font-medium text-slate-500">{parent}</p> : null}
        {schoolLine ? <p className="mt-0.5 text-sm font-semibold text-slate-900">{schoolLine}</p> : null}
        {sessionLine ? <p className="mt-0.5 text-xs text-slate-500">{sessionLine}</p> : null}
      </div>
      {profile.beneficiaryTypeLabel ? (
        <span className="shrink-0 rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
          {profile.beneficiaryTypeLabel}
        </span>
      ) : null}
    </div>
  );
}
