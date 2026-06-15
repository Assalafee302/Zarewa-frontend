import React from 'react';
import { PageTabs } from '../layout/PageTabs';
import { HrPageBody, HrPageIntro } from './hrPageUi';

/**
 * Standard tabbed HR hub layout — title, optional actions, PageTabs, content.
 */
export function HrTabbedPage({ title, description, actions, tabs, tab, onTabChange, compact = true, children }) {
  return (
    <HrPageBody compact={compact}>
      <HrPageIntro title={title} description={description} actions={actions} />
      {tabs?.length ? (
        <PageTabs tabs={tabs} value={tab} onChange={onTabChange} />
      ) : null}
      <div>{children}</div>
    </HrPageBody>
  );
}
