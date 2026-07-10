import { describe, expect, it } from 'vitest';
import { parseApiError } from './apiBase.js';

describe('parseApiError', () => {
  it('prefers error over message', () => {
    expect(parseApiError({ error: 'Not found', message: 'Other' }).message).toBe('Not found');
  });

  it('falls back to default', () => {
    expect(parseApiError(null).message).toContain('Something went wrong');
  });

  it('extracts code', () => {
    expect(parseApiError({ error: 'Denied', code: 'FORBIDDEN' }).code).toBe('FORBIDDEN');
  });
});
