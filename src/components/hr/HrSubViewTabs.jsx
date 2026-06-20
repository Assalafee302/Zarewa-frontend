import React from 'react';
import { PageTabs } from '../layout/PageTabs';

/**
 * Secondary section tabs inside HR hub pages — consistent ARIA tablist styling.
 */
export function HrSubViewTabs({ tabs, value, onChange, ariaLabel = 'Section views' }) {
  return <PageTabs tabs={tabs} value={value} onChange={onChange} ariaLabel={ariaLabel} />;
}
