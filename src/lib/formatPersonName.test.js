import { describe, it, expect } from 'vitest';
import { formatPersonName } from './formatPersonName';

describe('formatPersonName', () => {
  it('title-cases each word', () => {
    expect(formatPersonName('john doe')).toBe('John Doe');
    expect(formatPersonName('JOHN DOE')).toBe('John Doe');
    expect(formatPersonName('  mary-jane o\'brien  ')).toBe("Mary-Jane O'Brien");
  });

  it('preserves empty and placeholder values', () => {
    expect(formatPersonName('')).toBe('');
    expect(formatPersonName('—')).toBe('—');
    expect(formatPersonName(null)).toBe('');
  });
});
