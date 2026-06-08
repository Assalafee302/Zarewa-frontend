import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './lazyWithRetry';

describe('isChunkLoadError', () => {
  it('detects failed dynamic import messages', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/HrPayeTaxPension-CHDk8aV7.js'))
    ).toBe(true);
    expect(isChunkLoadError(new Error('Something else'))).toBe(false);
  });
});
