import React, { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { UserProfileProvider, useUserProfile } from '../../context/UserProfileContext';
import { buildUserProfileNav } from '../../lib/userProfileActions';

function ProfileSubnav() {
  const { cohort, hasHrSelfService } = useUserProfile();
  const nav = useMemo(
    () => buildUserProfileNav(cohort, hasHrSelfService),
    [cohort, hasHrSelfService]
  );

  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory custom-scrollbar [-webkit-overflow-scrolling:touch]"
      aria-label="Profile sections"
    >
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `shrink-0 snap-start rounded-xl px-4 py-2.5 min-h-11 inline-flex items-center text-xs font-bold uppercase tracking-wide border transition-colors ${
              isActive
                ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 active:bg-slate-50'
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
      ? 'Account hub — password, access, and shortcuts. School fees, documents, and stipend are in HR self-service.'
      : cohort === 'domestic'
        ? 'Account hub — password and access. Payslips and documents are in HR self-service.'
        : cohort === 'account_only'
          ? 'Account hub — profile, security, and workspace shortcuts.'
          : 'Account hub — password and access. Leave, payslips, and employment forms are in HR self-service.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader eyebrow="Account" title="My profile" subtitle={subtitle} />
      <div className="sticky top-0 z-30 -mx-2 mb-4 border-b border-slate-200/80 bg-[#F8FAFC]/95 px-2 py-2 backdrop-blur-md sm:-mx-1 sm:px-1">
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
