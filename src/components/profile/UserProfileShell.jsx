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
    `shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] no-underline transition-all ${
      active
        ? 'bg-[#134e4a] text-white shadow-lg shadow-teal-950/15'
        : 'text-slate-500 hover:bg-slate-50 hover:text-[#134e4a]'
    }`;

  return (
    <nav
      aria-label="Account sections"
      className="inline-flex w-full max-w-full min-w-0 flex-wrap gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/80 bg-white/88 p-1.5 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)] backdrop-blur-xl [-webkit-overflow-scrolling:touch]"
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
      ? 'Password, access, and shortcuts to your benefits hub.'
      : cohort === 'account_only'
        ? 'Profile, security, and workspace shortcuts.'
        : 'Sign-in details, security, and shortcuts to HR services.';

  return (
    <PageShell className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PageHeader
        eyebrow="Profile"
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

      <div className="mb-4">
        <AccountSubnav />
      </div>

      <MainPanel>
        <Outlet />
      </MainPanel>
    </PageShell>
  );
}

export function UserProfileShell() {
  return <UserProfileShellInner />;
}
