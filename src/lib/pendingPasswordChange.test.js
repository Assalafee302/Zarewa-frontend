import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPendingPasswordChange,
  hasPendingPasswordChange,
  markPendingPasswordChange,
  withPendingPasswordSession,
} from './pendingPasswordChange.js';

describe('pendingPasswordChange', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('tracks pending state per user id', () => {
    markPendingPasswordChange('user-1');
    expect(hasPendingPasswordChange('user-1')).toBe(true);
    expect(hasPendingPasswordChange('user-2')).toBe(false);
    clearPendingPasswordChange('user-1');
    expect(hasPendingPasswordChange('user-1')).toBe(false);
  });

  it('forces mustChangePassword on bootstrap payloads while pending', () => {
    markPendingPasswordChange('user-1');
    const out = withPendingPasswordSession({
      ok: true,
      session: { user: { id: 'user-1', username: 'staff', mustChangePassword: false } },
    });
    expect(out.session.user.mustChangePassword).toBe(true);
  });
});
