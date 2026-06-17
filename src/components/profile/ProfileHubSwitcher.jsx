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
    `inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition no-underline sm:flex-none ${
      active
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const hrHubPath =
    cohort === 'scholarship' ? HR_SELF_SERVICE_PATH.school : cohort === 'domestic' ? HR_SELF_SERVICE_PATH.home : HR_SELF_SERVICE_PATH.overview;
  const hrHubLabel =
    cohort === 'scholarship' ? FAMILY_BENEFITS.hubSwitcherLabel : cohort === 'domestic' ? DOMESTIC_BENEFITS.hubSwitcherLabel : 'HR services';

  return (
    <nav
      aria-label="Profile area"
      className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1"
    >
      <NavLink to={ACCOUNT_PATH.overview} className={({ isActive }) => tabClass(onAccountHub || isActive)} end>
        <UserCircle size={16} className="shrink-0" aria-hidden />
        <span>Account</span>
      </NavLink>
      <NavLink
        to={hrHubPath}
        className={({ isActive }) => tabClass(!onAccountHub && (isActive || location.pathname.startsWith('/my-profile')))}
      >
        <Building2 size={16} className="shrink-0" aria-hidden />
        <span>{hrHubLabel}</span>
      </NavLink>
    </nav>
  );
}
