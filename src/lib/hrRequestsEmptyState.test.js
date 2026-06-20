import { describe, expect, it } from 'vitest';
import { hrRequestsEmptyState } from './hrRequestsEmptyState';

describe('hrRequestsEmptyState', () => {
  it('returns self-service copy for mine scope', () => {
    const empty = hrRequestsEmptyState('mine', { selfService: true });
    expect(empty.title).toMatch(/No requests/i);
    expect(empty.quickLinks.length).toBeGreaterThan(0);
  });

  it('returns manager guidance for endorse queue', () => {
    const empty = hrRequestsEmptyState('endorse_queue');
    expect(empty.title).toMatch(/endorsements/i);
    expect(empty.quickLinks.some((l) => l.label.includes('calendar'))).toBe(true);
  });
});
