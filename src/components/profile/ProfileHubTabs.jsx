import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, UserCircle } from 'lucide-react';
import { PageTabs } from '../layout';
import { useUserProfile } from '../../context/UserProfileContext';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';

/**
 * Hub switcher — Account vs HR services — using the same PageTabs pattern as Sales / Procurement.
 */
export function ProfileHubTabs() {
  const { hasHrSelfService, cohort } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const hrHubPath =
    cohort === 'scholarship'
      ? HR_SELF_SERVICE_PATH.school
      : cohort === 'domestic'
        ? HR_SELF_SERVICE_PATH.home
        : HR_SELF_SERVICE_PATH.overview;

  const hrHubLabel =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.hubSwitcherLabel
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.hubSwitcherLabel
        : 'My HR';

  const onAccountHub = location.pathname === '/me' || location.pathname.startsWith('/me/');

  const value = onAccountHub ? 'account' : 'hr';

  const tabs = useMemo(
    () => [
      { id: 'account', label: 'Account', icon: <UserCircle size={16} /> },
      ...(hasHrSelfService && cohort !== 'account_only'
        ? [{ id: 'hr', label: hrHubLabel, icon: <Building2 size={16} /> }]
        : []),
    ],
    [hasHrSelfService, cohort, hrHubLabel]
  );

  if (tabs.length <= 1) return null;

  const handleChange = (id) => {
    if (id === 'account') navigate(ACCOUNT_PATH.overview);
    else navigate(hrHubPath);
  };

  return (
    <nav aria-label="Profile area">
      <PageTabs tabs={tabs} value={value} onChange={handleChange} />
    </nav>
  );
}
