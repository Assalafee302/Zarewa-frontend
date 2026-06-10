import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  dismissNotification,
  endOfLocalDayIso,
  filterDismissedNotifications,
  isNotificationDismissed,
  loadNotificationDismissals,
} from './notificationDismissal.js';

describe('notificationDismissal', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {},
      getItem(k) {
        return this.store[k] ?? null;
      },
      setItem(k, v) {
        this.store[k] = v;
      },
    });
  });

  it('snoozes until end of local day', () => {
    const dismissals = dismissNotification('u1', 'low-stock', { untilEndOfDay: true });
    expect(isNotificationDismissed(dismissals, 'low-stock')).toBe(true);
    expect(isNotificationDismissed(dismissals, 'other')).toBe(false);
  });

  it('filters dismissed notifications from a list', () => {
    dismissNotification('u1', 'a', { untilIso: endOfLocalDayIso() });
    const filtered = filterDismissedNotifications(
      [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      loadNotificationDismissals('u1')
    );
    expect(filtered.map((n) => n.id)).toEqual(['b']);
  });
});
