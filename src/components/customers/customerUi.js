/** Shared customer UI tokens — aligned with canonical Input / FORM tokens. */
import { FIELD, FORM } from '../../lib/designTokens';
import {
  customerPaymentChipClass,
  customerStatusChipClass,
  customerTierChipClass,
} from '../../lib/customerStatusUi';

export const CUSTOMER_FIELD = FIELD.base;

export const CUSTOMER_SELECT = 'z-select';

export const CUSTOMER_TEXTAREA = 'z-textarea min-h-[88px]';

export const CUSTOMER_LABEL = FIELD.label;

export const CUSTOMER_SECTION = FORM.section;

export const CUSTOMER_SECTION_TITLE = FORM.sectionTitle;

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
