import React from 'react';
import { SalesStatusChip } from '../ui/StatusBadge';
import { poStatusChipClass, poStatusDisplayLabel } from '../../lib/procurementStatusUi';

export function PoStatusChip({ status, className = '' }) {
  const label = poStatusDisplayLabel(status);
  return <SalesStatusChip label={label} chipClass={poStatusChipClass(status)} className={className} />;
}
