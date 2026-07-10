import React from 'react';
import { SalesStatusChip } from '../ui/StatusBadge';
import {
  customerPaymentChipClass,
  customerStatusChipClass,
  customerTierChipClass,
} from '../../lib/customerStatusUi';

export function CustomerStatusChip({ status, className = '' }) {
  const label = String(status || '—').trim() || '—';
  return <SalesStatusChip label={label} chipClass={customerStatusChipClass(status)} className={className} />;
}

export function CustomerTierChip({ tier, className = '' }) {
  const label = String(tier || '—').trim() || '—';
  return <SalesStatusChip label={label} chipClass={customerTierChipClass(tier)} className={className} />;
}

export function CustomerPaymentChip({ label, tone = 'ok', className = '' }) {
  return (
    <SalesStatusChip
      label={label || '—'}
      chipClass={customerPaymentChipClass(tone)}
      className={className}
    />
  );
}
