import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { ProfileHubTabs } from './ProfileHubTabs';
import { ProfileSidebarNav, ProfileMobileNav } from './ProfileSidebarNav';
import { ProfileAccentBar } from './profileDesign';
import { HrNotificationsPanel } from '../hr/HrNotificationsPanel';

/**
 * HR services layout — Sales / Procurement module pattern.
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
        eyebrow="Profile"
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

      <div className="mb-4 lg:hidden">
        <ProfileMobileNav cohort={cohort} />
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row lg:gap-8 min-w-0">
        <aside className="hidden w-56 shrink-0 lg:sticky lg:top-24 lg:block">
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <ProfileAccentBar />
            <div className="p-3">
              <ProfileSidebarNav cohort={cohort} />
            </div>
          </div>
        </aside>

        <MainPanel className="min-w-0 flex-1 !min-h-0">
          <Outlet context={outletContext} />
        </MainPanel>
      </div>
    </PageShell>
  );
}
