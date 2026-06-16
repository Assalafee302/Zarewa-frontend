/** Shared scholarship beneficiary UI helpers. */

export { FAMILY_BENEFITS, linkedExecutiveLabel, beneficiaryTypeLabel, familyParentLine } from './familyBenefitsUi.js';

export const PAYMENT_HEALTH = {
  on_track: { label: 'On track', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  action_needed: { label: 'Action needed', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  overdue: { label: 'Overdue', className: 'bg-rose-50 text-rose-800 border-rose-200' },
  setup_incomplete: { label: 'Setup incomplete', className: 'bg-violet-50 text-violet-800 border-violet-200' },
};

export const PAYMENT_KIND_ICON = {
  stipend: '💳',
  school_fee: '🏫',
  salary: '💰',
};

export function paymentHealthMeta(health) {
  return PAYMENT_HEALTH[health] || PAYMENT_HEALTH.on_track;
}

export function formatTermCountdown(days) {
  if (days == null) return null;
  if (days < 0) return `Term ended ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Term ends today';
  if (days === 1) return 'Term ends tomorrow';
  return `Term ends in ${days} days`;
}
