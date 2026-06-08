import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';

/**
 * Admin panel: failed login summary and active sessions (Phase 12).
 */
export default function LoginSecurityPanel() {
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [sumRes, sessRes] = await Promise.all([
        apiFetch('/api/admin/security/login-summary?hours=24'),
        apiFetch('/api/admin/security/active-sessions'),
      ]);
      if (!sumRes.ok || !sumRes.data?.ok) {
        setError(sumRes.data?.error || 'Could not load login summary.');
        return;
      }
      setSummary(sumRes.data);
      if (sessRes.ok && sessRes.data?.ok) {
        setSessions(Array.isArray(sessRes.data.sessions) ? sessRes.data.sessions : []);
      }
    } catch (e) {
      setError(String(e?.message || e || 'Could not load security data.'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-teal-800" />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Login & session security</h3>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="z-btn-secondary !py-1.5 !text-xs gap-1"
        >
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
      ) : null}

      {summary ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Failed logins (24h)', summary.failedLoginAttempts],
            ['Account locks (24h)', summary.accountLockEvents],
            ['Session timeouts (24h)', summary.sessionTimeouts],
            ['Active sessions', summary.activeSessionCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-slate-900">{value ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Active sessions</h4>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Last seen</th>
                <th className="px-3 py-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-500">
                    No active sessions.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={`${s.userId}-${s.lastSeenAtIso}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {s.displayName || s.username}
                      <span className="block text-[10px] text-slate-500">@{s.username}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{s.roleKey}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {s.lastSeenAtIso ? new Date(s.lastSeenAtIso).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {s.expiresAtIso ? new Date(s.expiresAtIso).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
