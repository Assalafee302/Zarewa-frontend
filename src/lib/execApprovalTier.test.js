import { describe, expect, it } from 'vitest';
import {
  approvalTierChipClass,
  classifyExecWorkTrayApprovalTier,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from './execApprovalTier.js';

describe('execApprovalTier', () => {
  it('classifies price exception as MD only', () => {
    expect(classifyExecWorkTrayApprovalTier({ kind: 'price_exception' }).tier).toBe(
      EXEC_APPROVAL_TIER_MD_ONLY
    );
  });

  it('classifies low refund as shared', () => {
    expect(
      classifyExecWorkTrayApprovalTier(
        { kind: 'refunds', amountNgn: 100_000 },
        { refundExecutiveThresholdNgn: 1_000_000 }
      ).tier
    ).toBe(EXEC_APPROVAL_TIER_SHARED);
  });

  it('styles MD-only chip distinctly', () => {
    expect(approvalTierChipClass(EXEC_APPROVAL_TIER_MD_ONLY)).toMatch(/violet/);
  });
});
