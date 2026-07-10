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
  moreNavLabel = 'Programs',
  moduleTitle = null,
  moduleSubtitle = null,
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
      {moduleTitle || moduleSubtitle ? (
        <div className="mb-3">
          {moduleTitle ? <h1 className="z-page-title text-zarewa-teal">{moduleTitle}</h1> : null}
          {moduleSubtitle ? <p className="z-page-subtitle mt-0.5">{moduleSubtitle}</p> : null}
        </div>
      ) : null}
      {navItems.length > 0 ? (
        <div className="mb-4">
          <HrSubnav
            items={navItems}
            moreItems={moreNavItems}
            moreLabel={moreNavLabel}
            sticky={stickySubnav}
          />
        </div>
      ) : null}
      <MainPanel className={compact ? '!p-3 sm:!p-5 !min-h-0' : ''}>
        {useOutlet ? <Outlet context={outletContext} /> : children}
      </MainPanel>
    </PageShell>
  );
}
