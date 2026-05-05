import { describe, it, expect } from 'vitest';
import { normalizeEditApprovalInput } from './editApprovalInput.js';

describe('normalizeEditApprovalInput', () => {
  it('keeps only digits and max 6 for numeric codes', () => {
    expect(normalizeEditApprovalInput('12a34b56')).toBe('123456');
    expect(normalizeEditApprovalInput('  123  ')).toBe('123');
    expect(normalizeEditApprovalInput('123456789')).toBe('123456');
  });

  it('preserves legacy EA- ids up to cap', () => {
    expect(normalizeEditApprovalInput('EA-abc-def')).toBe('EA-abc-def');
    expect(normalizeEditApprovalInput('ea-xyz')).toBe('ea-xyz');
  });

  it('trims whitespace', () => {
    expect(normalizeEditApprovalInput('  456789  ')).toBe('456789');
  });
});
