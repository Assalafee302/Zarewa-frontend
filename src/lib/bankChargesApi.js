/**
 * POST cashier bank charge — treasury debit + Bank charges expense (GL 6170).
 */
import { apiFetch } from './apiBase';
import { treasuryAccountIdForApiPayload } from './treasuryAccountsStore';

/**
 * @param {{
 *   treasuryAccountId: unknown;
 *   amountNgn: number;
 *   dateISO: string;
 *   description?: string;
 *   reference?: string;
 * }} body
 */
export function postBankCharge(body) {
  return apiFetch('/api/treasury/bank-charges', {
    method: 'POST',
    body: JSON.stringify({
      treasuryAccountId: treasuryAccountIdForApiPayload(body.treasuryAccountId),
      amountNgn: Math.round(Number(body.amountNgn) || 0),
      dateISO: String(body.dateISO || '').trim().slice(0, 10),
      description: String(body.description || '').trim() || undefined,
      reference: String(body.reference || '').trim() || undefined,
    }),
  });
}

export const BANK_CHARGE_KINDS = [
  { id: 'cot', label: 'COT / turnover charge' },
  { id: 'stamp_duty', label: 'Stamp duty' },
  { id: 'transfer_fee', label: 'Transfer / electronic fee' },
  { id: 'sms', label: 'SMS / alert charges' },
  { id: 'maintenance', label: 'Account maintenance' },
  { id: 'other', label: 'Other bank charges' },
];
