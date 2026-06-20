import React from 'react';
import { PageHeader } from '../layout/PageHeader';
import { PageTabs } from '../layout/PageTabs';
import { HrPageBody } from './hrPageUi';
import { HrHubToolbar } from './HrHubToolbar';

/**
 * Standard tabbed HR hub layout — single page header with tabs + toolbar.
 */
export function HrTabbedPage({
  title,
  description,
  actions,
  hub = 'hr',
  hubPrompt = '',
  hubPageContext = {},
  tabs,
  tab,
  onTabChange,
  compact = true,
  children,
}) {
  const toolbar =
    actions || hubPrompt ? (
      <HrHubToolbar hub={hub} prompt={hubPrompt} pageContext={{ tab, ...hubPageContext }}>
        {actions}
      </HrHubToolbar>
    ) : null;

  return (
    <HrPageBody compact={compact}>
      <PageHeader
        title={title}
        subtitle={description || undefined}
        tabs={tabs?.length ? <PageTabs tabs={tabs} value={tab} onChange={onTabChange} /> : null}
        toolbar={toolbar}
      />
      <div>{children}</div>
    </HrPageBody>
  );
}
