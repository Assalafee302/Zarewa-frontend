import React, { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { UserProfileProvider, useUserProfile } from '../../context/UserProfileContext';
import { buildUserProfileNav } from '../../lib/userProfileActions';
import { ProfileHubSwitcher } from './ProfileHubSwitcher';

function ProfileSubnav() {
  const { cohort, hasHrSelfService } = useUserProfile();
  const nav = useMemo(
    () => buildUserProfileNav(cohort, hasHrSelfService),
    [cohort, hasHrSelfService]
  );

  return (
    <nav
      aria-label="Account sections"
      className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 bg-white p-1 [-webkit-overflow-scrolling:touch]"
    >
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `shrink-0 rounded-md px-3 py-2 min-h-9 inline-flex items-center text-sm font-medium transition no-underline ${
              isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserProfileShellInner() {
  const { cohort } = useUserProfile();

  const subtitle =
    cohort === 'scholarship'
      ? 'Password, access, and shortcuts.'
      : cohort === 'domestic'
        ? 'Password, access, and shortcuts.'
        : cohort === 'account_only'
          ? 'Profile, security, and workspace shortcuts.'
          : 'Password and access settings.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader eyebrow="Account" title="My profile" subtitle={subtitle} />
      <div className="sticky top-0 z-30 mb-4 space-y-3 border-b border-slate-200 bg-[#F8FAFC]/95 py-3 backdrop-blur-md">
        <ProfileHubSwitcher />
        <ProfileSubnav />
      </div>
      <MainPanel>
        <Outlet />
      </MainPanel>
    </PageShell>
  );
}

export function UserProfileShell() {
  return (
    <UserProfileProvider>
      <UserProfileShellInner />
    </UserProfileProvider>
  );
}
