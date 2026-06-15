import { describe, it, expect } from 'vitest';
import {
  userMayPerformManagerQuotationClearance,
  isManagerClearanceAuthorityRoleKey,
  userMayReleaseQuotationPaymentHold,
  isExecutiveRoleKey,
} from './workspaceGovernanceClient.js';

/** Expected parity with shared/workspaceGovernance.js (server source of truth). */
const CLEARANCE_MATRIX = [
  { actor: { roleKey: 'sales_manager', permissions: ['quotations.manage'] }, clearance: true },
  { actor: { roleKey: 'sales_staff', permissions: ['quotations.manage'] }, clearance: false },
  { actor: { roleKey: 'admin', permissions: ['*'] }, clearance: true },
  { actor: { roleKey: 'md', permissions: ['exec.dashboard.view'] }, clearance: true },
];

const RELEASE_HOLD_MATRIX = [
  { actor: { roleKey: 'sales_manager', permissions: ['quotations.manage'] }, release: false },
  { actor: { roleKey: 'md', permissions: [] }, release: true },
  { actor: { roleKey: 'admin', permissions: ['*'] }, release: true },
];

describe('workspaceGovernance client rules', () => {
  for (const { actor, clearance } of CLEARANCE_MATRIX) {
    it(`manager clearance for ${actor.roleKey}`, () => {
      expect(userMayPerformManagerQuotationClearance(actor)).toBe(clearance);
      expect(isManagerClearanceAuthorityRoleKey(actor.roleKey)).toBe(clearance);
    });
  }

  for (const { actor, release } of RELEASE_HOLD_MATRIX) {
    it(`payment hold release for ${actor.roleKey}`, () => {
      expect(userMayReleaseQuotationPaymentHold(actor)).toBe(release);
    });
  }

  it('executive role keys', () => {
    expect(isExecutiveRoleKey('md')).toBe(true);
    expect(isExecutiveRoleKey('ceo')).toBe(true);
    expect(isExecutiveRoleKey('sales_staff')).toBe(false);
  });
});
