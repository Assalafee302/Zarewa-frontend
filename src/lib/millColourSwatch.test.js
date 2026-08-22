import { describe, it, expect } from 'vitest';
import { millColourHex } from './millColourSwatch.js';
import { normalizeColourKey } from './colourCanonicalization.js';

describe('millColourSwatch', () => {
  it('maps catalogue names and aliases to the same chip', () => {
    expect(millColourHex('Nut Brown')).toBe('#5a3a24');
    expect(millColourHex('nut bron')).toBe('#5a3a24');
    expect(millColourHex('Gray Beige')).toBe('#c4b49a');
    expect(millColourHex('')).toBe('');
    expect(millColourHex('Unknown Paint')).toBe('');
  });

  it('resolves abbreviations through colour aliases', () => {
    expect(normalizeColourKey('HM Blue')).toBe('hmblue');
    expect(millColourHex('HMB')).toBe('#1b4f8a');
  });
});
