import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';
import { HrSubnav } from './HrSubnav';

/**
 * Shared chrome for Human Resources, My Profile, Team HR, and Executive HR routes.
 */
export function HrSectionShell({
  title,
  subtitle,
  navItems = [],
  navGroups = [],
  children,
  useOutlet = true,
}) {
  return (
    <PageShell className="pb-10">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {(navGroups.length > 0 || navItems.length > 0) && (
          <aside className="w-full shrink-0 lg:w-52 xl:w-56">
            <HrSubnav items={navItems} groups={navGroups} />
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <MainPanel>{useOutlet ? <Outlet /> : children}</MainPanel>
        </div>
      </div>
    </PageShell>
  );
}
