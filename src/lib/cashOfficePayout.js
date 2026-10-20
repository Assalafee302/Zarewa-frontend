import { treasuryAccountIsCashOffice } from '../shared/lib/payoutAccountGuard.js';

/** Owner D2: true when any pay line is paid from a Cash Office (treasury account type Cash). */
export function payLinesUseCashOffice(lines = [], accounts = []) {
  const typeById = new Map((accounts || []).map((a) => [String(a?.id), a?.type]));
  return (lines || []).some((l) => treasuryAccountIsCashOffice(typeById.get(String(l?.treasuryAccountId))));
}
