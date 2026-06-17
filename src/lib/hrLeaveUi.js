export const LEAVE_TYPE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  maternity: 'Maternity leave',
  compassionate: 'Compassionate leave',
  unpaid: 'Leave without pay',
  other: 'Other leave',
  casual: 'Casual leave',
};

export function leaveTypeLabel(type) {
  const key = String(type || '').trim().toLowerCase();
  return LEAVE_TYPE_LABELS[key] || key.replace(/_/g, ' ') || 'Leave';
}
