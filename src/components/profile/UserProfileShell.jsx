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
    `relative shrink-0 whitespace-nowrap px-2.5 py-2 text-[13px] font-semibold no-underline transition-colors min-h-9 inline-flex items-center ${
      active
        ? 'text-zarewa-teal after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-zarewa-teal'
        : 'text-slate-500 hover:text-zarewa-teal'
    }`;

  return (
    <nav
      aria-label="Account sections"
      className="flex w-full min-w-0 gap-0.5 overflow-x-auto border-b border-slate-200/90 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        : 'Sign-in details, security, and shortcuts to My HR.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader
        title="Account"
        subtitle={subtitle}
        tabs={<ProfileHubTabs />}
        toolbar={
          hasHrSelfService && cohort !== 'account_only' ? <HrNotificationsPanel compact /> : null
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
