import React from 'react';
import { PageTabs } from '../../layout/PageTabs';
import {
  secondaryTabsForZoneWithMode,
  tabIconComponent,
  zoneForTabWithMode,
  accountingZonesForActor,
} from '../../../lib/accountingDeskNav';

/**
 * Two-level desk navigation: zones (primary) + leaf tabs (secondary).
 * @param {{ tab: string; onTabChange: (tabId: string) => void; readOnlyExecutive?: boolean }} props
 */
export function AccountingDeskNav({ tab, onTabChange, readOnlyExecutive = false }) {
  const navOpts = { readOnlyExecutive };
  const zones = accountingZonesForActor(navOpts);
  const zoneId = zoneForTabWithMode(tab, navOpts);
  const secondary = secondaryTabsForZoneWithMode(zoneId, navOpts);

  const zoneTabs = zones.map((z) => ({
    id: z.id,
    label: z.label,
    icon: z.icon ? <z.icon size={16} /> : null,
  }));

  const onZoneChange = (nextZoneId) => {
    const zone = zones.find((z) => z.id === nextZoneId);
    if (!zone) return;
    if (zone.tabs.includes(tab)) return;
    onTabChange(zone.tabs[0]);
  };

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2">
      <PageTabs tabs={zoneTabs} value={zoneId} onChange={onZoneChange} ariaLabel="Accounting desk zone" />
      {secondary.length > 1 ? (
        <PageTabs
          tabs={secondary.map((t) => {
            const Icon = tabIconComponent(t.id);
            return { ...t, icon: <Icon size={16} /> };
          })}
          value={tab}
          onChange={onTabChange}
          ariaLabel="Accounting desk section"
        />
      ) : null}
    </div>
  );
}
