import React from 'react';
import { familyParentLine } from '../../lib/familyBenefitsUi';

/**
 * Compact banner on payments/requests pages — reinforces executive-family context.
 * @param {{ profile?: object | null }} props
 */
export function FamilyBenefitsContextBar({ profile }) {
  if (!profile) return null;

  const parent =
    profile.familyParentLine ||
    familyParentLine(profile);
  const schoolLine = [profile.schoolName, profile.classLevel].filter(Boolean).join(' · ');
  const sessionLine = [profile.currentTerm, profile.academicSession].filter(Boolean).join(' · ');

  if (!parent && !schoolLine) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        {parent ? (
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{parent}</p>
        ) : null}
        {schoolLine ? <p className="mt-0.5 text-sm font-semibold text-slate-900">{schoolLine}</p> : null}
        {sessionLine ? <p className="mt-0.5 text-xs text-slate-500">{sessionLine}</p> : null}
      </div>
      {profile.beneficiaryTypeLabel ? (
        <span className="shrink-0 rounded-full border border-violet-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-violet-800">
          {profile.beneficiaryTypeLabel}
        </span>
      ) : null}
    </div>
  );
}
