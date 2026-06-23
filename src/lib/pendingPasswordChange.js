const PREFIX = 'zarewa.pending-password-change:';

export function markPendingPasswordChange(userId) {
  const id = String(userId || '').trim();
  if (!id) return;
  try {
    sessionStorage.setItem(`${PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
}

export function clearPendingPasswordChange(userId) {
  const id = String(userId || '').trim();
  if (!id) return;
  try {
    sessionStorage.removeItem(`${PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}

export function hasPendingPasswordChange(userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  try {
    return sessionStorage.getItem(`${PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

/** Force must-change flag on bootstrap payloads while first-login password is outstanding. */
export function withPendingPasswordSession(data) {
  if (!data || typeof data !== 'object') return data;
  const uid = data?.session?.user?.id;
  if (!uid || !data.session?.user) return data;
  if (data.session.user.mustChangePassword === false) return data;
  if (!hasPendingPasswordChange(uid)) return data;
  if (data.session.user.mustChangePassword) return data;
  return {
    ...data,
    session: {
      ...data.session,
      user: { ...data.session.user, mustChangePassword: true },
    },
  };
}
