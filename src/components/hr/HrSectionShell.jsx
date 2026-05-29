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
  children,
  useOutlet = true,
}) {
  return (
    <PageShell className="pb-10">
      <PageHeader title={title} subtitle={subtitle} />
      {navItems.length > 0 ? (
        <div className="mb-6">
          <HrSubnav items={navItems} />
        </div>
      ) : null}
      <MainPanel>
        {useOutlet ? <Outlet /> : children}
      </MainPanel>
    </PageShell>
  );
}
