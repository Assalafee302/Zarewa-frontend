import { describe, expect, it } from 'vitest';
import {
  countAgedAttentionItems,
  countAbsentFromRoll,
  countMachinesDown,
  MANAGER_AGED_QUEUE_HOURS,
} from './managerDashboardCore.js';

describe('manager ops strip counters', () => {
  it('counts machine_down and aged-open WOs', () => {
    const now = Date.now();
    const hoursAgo = (h) => new Date(now - h * 36e5).toISOString();
    expect(
      countMachinesDown([
        { priority: 'machine_down', openedAtIso: hoursAgo(1) },
        { priority: 'high', openedAtIso: hoursAgo(30) },
        { priority: 'low', openedAtIso: hoursAgo(2) },
        { priority: 'normal' },
      ])
    ).toBe(2);
  });

  it('counts aged attention via atIso and skips unknown age', () => {
    const now = Date.now();
    const hoursAgo = (h) => new Date(now - h * 36e5).toISOString();
    expect(MANAGER_AGED_QUEUE_HOURS).toBe(24);
    expect(
      countAgedAttentionItems([
        { id: 'a', atIso: hoursAgo(30) },
        { id: 'b', atIso: hoursAgo(2) },
        { id: 'c' },
      ])
    ).toBe(1);
  });

  it('counts absent only when status is absent', () => {
    expect(
      countAbsentFromRoll([
        { userId: '1', status: 'present' },
        { userId: '2', status: 'absent' },
        { userId: '3', status: 'late' },
        { userId: '4', status: 'Absent' },
      ])
    ).toBe(2);
  });
});
