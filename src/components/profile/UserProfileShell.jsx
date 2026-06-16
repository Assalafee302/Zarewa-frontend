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
      className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/80 bg-white/90 p-1 shadow-sm sm:p-1.5 [-webkit-overflow-scrolling:touch]"
    >
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `shrink-0 rounded-xl px-2.5 py-2 min-h-10 inline-flex items-center text-[9px] font-bold uppercase tracking-[0.12em] transition no-underline sm:px-3 sm:py-2.5 sm:min-h-11 sm:text-[10px] ${
              isActive
                ? 'bg-[#134e4a] text-white shadow-md shadow-teal-950/15'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#134e4a]'
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
      ? 'Password, access, and shortcuts. School fees and allowance are in My benefits.'
      : cohort === 'domestic'
        ? 'Password, access, and shortcuts. Salary and documents are in My pay.'
        : cohort === 'account_only'
          ? 'Profile, security, and workspace shortcuts.'
          : 'Password and access. Leave, payslips, and employment forms are in HR self-service.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader eyebrow="Account" title="My profile" subtitle={subtitle} />
      <div className="sticky top-0 z-30 mb-3 space-y-2 border-b border-slate-200/80 bg-[#F8FAFC]/95 px-1 py-2 backdrop-blur-md sm:mb-4 sm:space-y-3 sm:px-0">
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
