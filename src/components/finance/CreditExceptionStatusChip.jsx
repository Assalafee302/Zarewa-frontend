import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';

const MAP = {
  pending: { label: 'Pending approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'muted' },
  revoked: { label: 'Revoked', tone: 'muted' },
  expired: { label: 'Expired', tone: 'danger' },
};

export function CreditExceptionStatusChip({ status }) {
  const key = String(status || '').toLowerCase();
  const m = MAP[key] || { label: status || 'Unknown', tone: 'neutral' };
  return <StatusBadge label={m.label} tone={m.tone} />;
}
