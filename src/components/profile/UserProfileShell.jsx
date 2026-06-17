import React, { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { useUserProfile } from '../../context/UserProfileContext';
import { buildUserProfileNav } from '../../lib/userProfileActions';
import { ProfileHubTabs } from './ProfileHubTabs';
import { HrNotificationsPanel } from '../hr/HrNotificationsPanel';

function AccountSubnav() {
  const { cohort, hasHrSelfService } = useUserProfile();
  const nav = useMemo(
    () => buildUserProfileNav(cohort, hasHrSelfService),
    [cohort, hasHrSelfService]
  );

  const tabClass = (active) =>
    `shrink-0 snap-start rounded-lg px-4 py-2.5 text-sm font-semibold no-underline transition-colors min-h-11 inline-flex items-center ${
      active
        ? 'bg-[#134e4a] text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <nav
      aria-label="Account sections"
      className="flex w-full min-w-0 gap-1.5 overflow-x-auto border-b border-slate-200/80 pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {nav.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserProfileShellInner() {
  const { cohort, hasHrSelfService } = useUserProfile();

  const subtitle =
    cohort === 'scholarship' || cohort === 'domestic'
      ? 'Sign-in, security, and shortcuts to your benefits hub.'
      : cohort === 'account_only'
        ? 'Profile, security, and workspace shortcuts.'
        : 'Sign-in details, security, and shortcuts to HR services.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader
        eyebrow="Workspace"
        title="Account"
        subtitle={subtitle}
        tabs={
          <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:items-end">
            <ProfileHubTabs />
            {hasHrSelfService && cohort !== 'account_only' ? (
              <div className="flex w-full justify-end">
                <HrNotificationsPanel compact />
              </div>
            ) : null}
          </div>
        }
      />

      <MainPanel>
        <AccountSubnav />
        <div className="mt-6">
          <Outlet />
        </div>
      </MainPanel>
    </PageShell>
  );
}

export function UserProfileShell() {
  return <UserProfileShellInner />;
}
