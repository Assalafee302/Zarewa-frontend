import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { ProfileSidebarNav, ProfileMobileNav } from './ProfileSidebarNav';

/**
 * My Profile layout with grouped sidebar navigation (desktop) and scrollable tabs (mobile).
 */
export function ProfileSectionShell({
  title,
  subtitle,
  cohort = 'employee',
  beforeNav = null,
  outletContext,
}) {
  return (
    <PageShell className="pb-10">
      <PageHeader title={title} subtitle={subtitle} />
      {beforeNav ? <div className="mb-4">{beforeNav}</div> : null}

      <div className="lg:hidden mb-4">
        <ProfileMobileNav cohort={cohort} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start min-w-0">
        <aside className="hidden lg:block w-52 shrink-0 lg:sticky lg:top-24">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <ProfileSidebarNav cohort={cohort} />
          </div>
        </aside>

        <MainPanel className="flex-1 min-w-0 !p-3 sm:!p-5 !min-h-0">
          <Outlet context={outletContext} />
        </MainPanel>
      </div>
    </PageShell>
  );
}
