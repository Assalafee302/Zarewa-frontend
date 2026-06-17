import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { ProfileHubTabs } from './ProfileHubTabs';
import { ProfileSidebarNav, ProfileMobileNav } from './ProfileSidebarNav';
import { HrNotificationsPanel } from '../hr/HrNotificationsPanel';

/**
 * HR services layout — open work surface (Sales / Procurement), not nested cards.
 */
export function ProfileSectionShell({
  title,
  subtitle,
  cohort = 'employee',
  beforeNav = null,
  outletContext,
}) {
  const isExecutiveBenefitsHub = cohort === 'scholarship' || cohort === 'domestic';

  return (
    <PageShell className="pb-10">
      <PageHeader
        eyebrow="Workspace"
        title={title}
        subtitle={subtitle}
        tabs={
          <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:items-end">
            <ProfileHubTabs />
            {isExecutiveBenefitsHub ? (
              <div className="flex w-full justify-end">
                <HrNotificationsPanel compact />
              </div>
            ) : null}
          </div>
        }
      />

      {beforeNav ? <div className="mb-4">{beforeNav}</div> : null}

      <MainPanel className="min-w-0 !min-h-0">
        <div className="mb-5 lg:hidden">
          <ProfileMobileNav cohort={cohort} />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="hidden w-52 shrink-0 lg:block">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Menu</p>
            <ProfileSidebarNav cohort={cohort} />
          </aside>

          <div className="min-w-0 flex-1 border-slate-200/80 lg:border-l lg:pl-8">
            <Outlet context={outletContext} />
          </div>
        </div>
      </MainPanel>
    </PageShell>
  );
}
