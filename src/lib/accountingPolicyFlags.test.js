import { describe, it, expect } from 'vitest';
import {
  isLocalGlEnabled,
  resolveLocalAccounting,
  syncLocalAccountingFromPayload,
} from './accountingPolicyFlags';
import { localAccountingCapabilities } from '../shared/lib/localAccountingSurfaces.js';

describe('accountingPolicyFlags local GL', () => {
  it('reads glPostingEnabled from workspace snapshot', () => {
    expect(isLocalGlEnabled({ localAccounting: localAccountingCapabilities(false) })).toBe(false);
    expect(isLocalGlEnabled({ localAccounting: localAccountingCapabilities(true) })).toBe(true);
  });

  it('defaults on when snapshot has no localAccounting', () => {
    syncLocalAccountingFromPayload({ glPostingEnabled: 'on' });
    expect(isLocalGlEnabled({})).toBe(true);
    expect(resolveLocalAccounting(null).creditorsDebtors).toBe(true);
  });

  it('syncs off from health payload string', () => {
    syncLocalAccountingFromPayload({ glPostingEnabled: 'off' });
    expect(isLocalGlEnabled(null)).toBe(false);
    syncLocalAccountingFromPayload({ glPostingEnabled: 'on' });
    expect(isLocalGlEnabled(null)).toBe(true);
  });
});
