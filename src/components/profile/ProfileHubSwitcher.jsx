import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, UserCircle } from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';

/**
 * Switches between the account hub (/me) and HR self-service (/my-profile).
 */
export function ProfileHubSwitcher() {
  const { hasHrSelfService, cohort } = useUserProfile();
  const location = useLocation();

  if (!hasHrSelfService || cohort === 'account_only') return null;

  const onAccountHub = location.pathname === '/me' || location.pathname.startsWith('/me/');

  const tabClass = (active) =>
    `inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition no-underline sm:min-h-11 sm:flex-none sm:gap-2 sm:px-5 sm:text-xs ${
      active
        ? 'bg-[#134e4a] text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-50 hover:text-[#134e4a]'
    }`;

  const hrHubPath =
    cohort === 'scholarship' ? HR_SELF_SERVICE_PATH.school : cohort === 'domestic' ? HR_SELF_SERVICE_PATH.home : HR_SELF_SERVICE_PATH.overview;
  const hrHubLabel =
    cohort === 'scholarship' ? FAMILY_BENEFITS.hubSwitcherLabel : cohort === 'domestic' ? DOMESTIC_BENEFITS.hubSwitcherLabel : 'HR hub';

  return (
    <nav
      aria-label="Profile area"
      className="flex gap-1 rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm sm:mb-0 sm:p-1.5"
    >
      <NavLink to={ACCOUNT_PATH.overview} className={({ isActive }) => tabClass(onAccountHub || isActive)} end>
        <UserCircle size={15} className="shrink-0 sm:w-4 sm:h-4" aria-hidden />
        <span className="truncate">Account</span>
      </NavLink>
      <NavLink
        to={hrHubPath}
        className={({ isActive }) => tabClass(!onAccountHub && (isActive || location.pathname.startsWith('/my-profile')))}
      >
        <Building2 size={15} className="shrink-0 sm:w-4 sm:h-4" aria-hidden />
        <span className="truncate">{hrHubLabel}</span>
      </NavLink>
    </nav>
  );
}
