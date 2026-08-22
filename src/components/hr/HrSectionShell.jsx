import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageShell, MainPanel } from '../layout';
import { HrSubnav } from './HrSubnav';

/**
 * Shared chrome for Human Resources, Team HR, and Executive HR.
 * Module context lives in the sidebar; subnav is the only top-level header.
 */
export function HrSectionShell({
  navItems = [],
  secondaryNavItems = [],
  eyebrow = null,
  moduleTitle = null,
  moduleSubtitle = null,
  stickySubnav = false,
  compact = false,
  beforeNav = null,
  afterNav = null,
  children,
  useOutlet = true,
  outletContext,
}) {
  return (
    <PageShell className="pb-10">
      {beforeNav ? <div className="mb-4">{beforeNav}</div> : null}
      {eyebrow || moduleTitle || moduleSubtitle ? (
        <div className="mb-3">
          {eyebrow ? <p className="mb-0.5 text-[11px] font-medium text-slate-500">{eyebrow}</p> : null}
          {moduleTitle ? <h1 className="z-page-title">{moduleTitle}</h1> : null}
          {moduleSubtitle ? <p className="z-page-subtitle mt-0.5">{moduleSubtitle}</p> : null}
        </div>
      ) : null}
      {navItems.length > 0 ? (
        <div className="mb-3">
          <HrSubnav items={navItems} secondaryItems={secondaryNavItems} sticky={stickySubnav} />
        </div>
      ) : null}
      {afterNav ? <div className="mb-3">{afterNav}</div> : null}
      <MainPanel className={compact ? '!p-3 sm:!p-5 !min-h-0' : ''}>
        {useOutlet ? <Outlet context={outletContext} /> : children}
      </MainPanel>
    </PageShell>
  );
}
