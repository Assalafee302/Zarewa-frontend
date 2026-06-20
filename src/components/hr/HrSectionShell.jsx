import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageShell, MainPanel } from '../layout';
import { HrSubnav } from './HrSubnav';

/**
 * Shared chrome for Human Resources, Team HR, and Executive HR routes.
 * Module context lives in the app sidebar; subnav is the only top-level header.
 */
export function HrSectionShell({
  navItems = [],
  moreNavItems = [],
  stickySubnav = false,
  compact = false,
  beforeNav = null,
  children,
  useOutlet = true,
  outletContext,
}) {
  return (
    <PageShell className="pb-10">
      {beforeNav ? <div className="mb-4">{beforeNav}</div> : null}
      {navItems.length > 0 ? (
        <div className="mb-4">
          <HrSubnav items={navItems} moreItems={moreNavItems} sticky={stickySubnav} />
        </div>
      ) : null}
      <MainPanel className={compact ? '!p-3 sm:!p-5 !min-h-0' : ''}>
        {useOutlet ? <Outlet context={outletContext} /> : children}
      </MainPanel>
    </PageShell>
  );
}
