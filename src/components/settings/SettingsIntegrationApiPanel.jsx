import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';

export function SettingsIntegrationApiPanel({ showToast, onRefresh }) {
  const [keys, setKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Automation');

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/settings/integration-api-keys');
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not load integration keys.', { variant: 'error' });
      return;
    }
    setKeys(Array.isArray(data.keys) ? data.keys : []);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/settings/integration-api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || 'API key' }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not create key.', { variant: 'error' });
        return;
      }
      const token = data.token;
      showToast(data.warning || 'Key created.', { variant: 'success' });
      if (token && typeof navigator?.clipboard?.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(token);
          showToast('Token copied to clipboard once — store it safely.', { variant: 'info' });
        } catch {
          window.prompt('Copy this token (shown once):', token);
        }
      }
      await load();
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!id) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/settings/integration-api-keys/${encodeURIComponent(id)}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not revoke key.', { variant: 'error' });
        return;
      }
      showToast('Key revoked.', { variant: 'success' });
      await load();
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <h3 className="z-section-title">Read-only integration API (Track G)</h3>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl leading-relaxed">
        Bearer tokens for automation: <span className="font-mono">GET /api/integration/v1/trial-balance</span> and{' '}
        <span className="font-mono">GET /api/integration/v1/journals</span>. Keys cannot post money. Usage is rate-limited
        and written to the audit log (no secret values logged).
      </p>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[12rem]">
          <label className="z-field-label">Key label</label>
          <input className="z-input w-full" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <button type="button" className="z-btn-primary !text-xs" disabled={busy} onClick={() => void createKey()}>
          {busy ? 'Working…' : 'Create key'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Suffix</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last used</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500 font-medium">
                  No keys yet.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-800">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">…{k.secretSuffix}</td>
                  <td className="px-3 py-2 text-slate-600">{k.createdAtISO || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{k.lastUsedAtISO || '—'}</td>
                  <td className="px-3 py-2">{k.revokedAtISO ? <span className="text-red-600 font-bold">Revoked</span> : 'Active'}</td>
                  <td className="px-3 py-2">
                    {!k.revokedAtISO ? (
                      <button
                        type="button"
                        className="text-[10px] font-black uppercase text-red-700 hover:underline"
                        disabled={busy}
                        onClick={() => void revoke(k.id)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
