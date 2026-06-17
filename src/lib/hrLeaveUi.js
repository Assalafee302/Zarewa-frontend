export const LEAVE_TYPE_LABELS = {
  annual: 'Annual leave',
  casual: 'Casual leave',
  sick: 'Sick leave',
  compassionate: 'Compassionate leave',
  unpaid: 'Unpaid leave',
  other: 'Other leave',
};

export function leaveTypeLabel(type) {
  const key = String(type || '').trim().toLowerCase();
  return LEAVE_TYPE_LABELS[key] || key.replace(/_/g, ' ') || 'Leave';
}
