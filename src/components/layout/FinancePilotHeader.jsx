import React from 'react';
import { PageHeader } from './PageHeader';

/**
 * Finance / manager module header — same compact chrome as every other page.
 */
export function FinancePilotHeader({
  eyebrow,
  title,
  subtitle,
  tabs,
  search,
  trailing,
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      tabs={tabs}
      search={search}
      trailing={trailing}
    />
  );
}
