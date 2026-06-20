import React from 'react';
import { PageHeader } from '../layout/PageHeader';
import { PageTabs } from '../layout/PageTabs';
import { HrPageBody } from './hrPageUi';
import { HrHubToolbar } from './HrHubToolbar';

/**
 * Standard tabbed HR hub layout — PageHeader + tabs + content.
 */
export function HrTabbedPage({
  eyebrow = 'Human Resources',
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
        eyebrow={eyebrow}
        title={title}
        subtitle={description}
        tabs={tabs?.length ? <PageTabs tabs={tabs} value={tab} onChange={onTabChange} /> : null}
        toolbar={toolbar}
      />
      <div>{children}</div>
    </HrPageBody>
  );
}
