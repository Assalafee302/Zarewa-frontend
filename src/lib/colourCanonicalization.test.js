import { describe, it, expect } from 'vitest';
import { canonicalColourName, normalizeColourKey } from './colourCanonicalization.js';

const masterData = {
  colours: [
    { name: 'Gray Beige', abbreviation: 'GB', active: true },
    { name: 'Ivory Beige', abbreviation: 'IV', active: true },
  ],
};

describe('colourCanonicalization', () => {
  it('treats grey and gray beige as the same', () => {
    expect(canonicalColourName(masterData, 'Grey Beige')).toBe('Gray Beige');
    expect(normalizeColourKey('Grey Beige')).toBe(normalizeColourKey('Gray Beige'));
  });

  it('maps nut bron typo to Nut Brown', () => {
    expect(canonicalColourName(masterData, 'nut bron')).toBe('Nut Brown');
  });
});
