import React from 'react';
import { SalesStatusChip } from '../ui/StatusBadge';
import { poStatusChipClass } from '../../lib/procurementStatusUi';

export function PoStatusChip({ status, className = '' }) {
  const label = String(status || '—').trim() || '—';
  return <SalesStatusChip label={label} chipClass={poStatusChipClass(status)} className={className} />;
}
