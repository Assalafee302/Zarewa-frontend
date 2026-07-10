/** Shared customer UI tokens and badge helpers. */

import {
  customerPaymentChipClass,
  customerStatusChipClass,
  customerTierChipClass,
} from '../../lib/customerStatusUi';

export const CUSTOMER_FIELD =
  'w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-3.5 text-sm font-semibold text-zarewa-teal outline-none transition-shadow placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15';

export const CUSTOMER_SELECT =
  'w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-3 text-sm font-semibold text-zarewa-teal outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15';

export const CUSTOMER_TEXTAREA = `${CUSTOMER_FIELD} resize-none font-medium leading-relaxed`;

export const CUSTOMER_LABEL =
  'text-ui-xs font-bold uppercase tracking-widest text-slate-500 ml-0.5';

export const CUSTOMER_SECTION =
  'rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5 space-y-4';

export const CUSTOMER_SECTION_TITLE =
  'text-ui-xs font-black uppercase tracking-widest text-zarewa-teal flex items-center gap-2';

export function customerInitials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function customerStatusTone(status) {
  return customerStatusChipClass(status);
}

export function customerTierTone(tier) {
  return customerTierChipClass(tier);
}

export function paymentRelationshipTone(tone) {
  return customerPaymentChipClass(tone);
}
