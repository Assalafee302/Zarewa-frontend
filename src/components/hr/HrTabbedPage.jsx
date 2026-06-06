import React from 'react';
import { PageTabs } from '../layout/PageTabs';
import { HrPageIntro } from './hrPageUi';

/**
 * Standard tabbed HR hub layout — title, optional actions, PageTabs, content.
 */
export function HrTabbedPage({ title, description, actions, tabs, tab, onTabChange, children }) {
  return (
    <div className="space-y-6">
      <HrPageIntro title={title} description={description} actions={actions} />
      {tabs?.length ? (
        <PageTabs tabs={tabs} value={tab} onChange={onTabChange} />
      ) : null}
      <div>{children}</div>
    </div>
  );
}
