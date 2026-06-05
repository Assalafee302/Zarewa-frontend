import React from 'react';
import { FinanceStatusChip } from './FinanceStatusChip';

const MAP = {
  pending: { label: 'Pending approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'critical' },
};

export function CreditExceptionStatusChip({ status }) {
  const key = String(status || '').toLowerCase();
  const m = MAP[key] || { label: status || 'Unknown', tone: 'neutral' };
  return <FinanceStatusChip label={m.label} tone={m.tone} />;
}
