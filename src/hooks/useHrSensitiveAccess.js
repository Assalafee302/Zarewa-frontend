import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import {
  clearHrSensitiveUnlock,
  hrSensitiveHeaders,
  readHrSensitiveUnlock,
  writeHrSensitiveUnlock,
} from '../lib/hrSensitiveStorage';

/**
 * Password re-verify gate for compensation, payslips, bank details, etc.
 */
export function useHrSensitiveAccess() {
  const [unlock, setUnlock] = useState(() => readHrSensitiveUnlock());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const tick = () => setUnlock(readHrSensitiveUnlock());
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const isUnlocked = Boolean(unlock?.token);

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
      const payload = { token: data.token, expiresAtIso: data.expiresAtIso };
      writeHrSensitiveUnlock(payload);
      setUnlock(payload);
      return true;
    } catch {
      setError('Could not verify password. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(() => {
    clearHrSensitiveUnlock();
    setUnlock(null);
  }, []);

  const fetchWithSensitive = useCallback((path, options = {}) => {
    return apiFetch(path, {
      ...options,
      headers: { ...(options.headers || {}), ...hrSensitiveHeaders() },
    });
  }, []);

  return {
    isUnlocked,
    unlockExpiresAtIso: unlock?.expiresAtIso ?? null,
    busy,
    error,
    setError,
    verifyPassword,
    lock,
    fetchWithSensitive,
    sensitiveHeaders: hrSensitiveHeaders,
  };
}
