import React from 'react';
import { PageHeader } from '../layout/PageHeader';
import { PageTabs } from '../layout/PageTabs';
import { HrPageBody } from './hrPageUi';

/**
 * Standard tabbed HR hub layout — PageHeader + tabs + content.
 */
export function HrTabbedPage({
  eyebrow = 'Human Resources',
  title,
  description,
  actions,
  tabs,
  tab,
  onTabChange,
  compact = true,
  children,
}) {
  return (
    <HrPageBody compact={compact}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={description}
        tabs={tabs?.length ? <PageTabs tabs={tabs} value={tab} onChange={onTabChange} /> : null}
        toolbar={actions}
      />
      <div>{children}</div>
    </HrPageBody>
  );
}
