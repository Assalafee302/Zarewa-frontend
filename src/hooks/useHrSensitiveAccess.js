import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { clearHrSensitiveUnlock } from '../lib/hrSensitiveStorage';

/**
 * Password re-verify gate for compensation, payslips, bank details, etc.
 * Unlock token is stored in an HttpOnly cookie — not in sessionStorage.
 */
export function useHrSensitiveAccess() {
  const [unlockExpiresAtIso, setUnlockExpiresAtIso] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const tick = () => {
      setUnlockExpiresAtIso((prev) => {
        if (!prev) {
          setIsUnlocked(false);
          return prev;
        }
        const stillValid = Date.parse(prev) > Date.now();
        setIsUnlocked(stillValid);
        return stillValid ? prev : null;
      });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const verifyPassword = useCallback(async (password, purpose = 'general') => {
    setBusy(true);
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/hr/sensitive/verify', {
        method: 'POST',
        body: JSON.stringify({ password, purpose }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Incorrect password.');
        return false;
      }
      setUnlockExpiresAtIso(data.expiresAtIso);
      return true;
    } catch {
      setError('Could not verify password. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(async () => {
    clearHrSensitiveUnlock();
    setUnlockExpiresAtIso(null);
    try {
      await apiFetch('/api/hr/sensitive/lock', { method: 'POST' });
    } catch {
      /* cookie clear is best-effort */
    }
  }, []);

  const fetchWithSensitive = useCallback((path, options = {}) => {
    return apiFetch(path, options);
  }, []);

  return {
    isUnlocked,
    unlockExpiresAtIso,
    busy,
    error,
    setError,
    verifyPassword,
    lock,
    fetchWithSensitive,
  };
}
