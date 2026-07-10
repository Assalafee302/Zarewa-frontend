import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const RISK_CLS = {
  critical: 'bg-red-100 text-red-900',
  high: 'bg-orange-100 text-orange-900',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-slate-100 text-slate-700',
  none: 'bg-slate-50 text-slate-500',
};

export default function CustomPermissionOverridesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [generatedAtIso, setGeneratedAtIso] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { ok, data } = await apiFetch('/api/admin/permission-overrides-audit');
    setLoading(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load permission override audit.');
      return;
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
    setGeneratedAtIso(data.generatedAtIso || '');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500 py-4">Loading permission override audit…</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
        {error}
        <button type="button" className="ml-2 font-bold underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-zarewa-teal">Custom permission overrides</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Users with extra permissions beyond their role default. Changes are audited as{' '}
            <code className="text-ui-xs">user.update_permissions</code>.
          </p>
        </div>
        {generatedAtIso ? (
          <p className="text-ui-xs text-slate-400 font-mono">Generated {generatedAtIso.slice(0, 19)}</p>
        ) : null}
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          No custom permission overrides on active users.
        </p>
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>User</AppTableTh>
                <AppTableTh>Role</AppTableTh>
                <AppTableTh>Risk</AppTableTh>
                <AppTableTh>Modules</AppTableTh>
                <AppTableTh>Extra permissions</AppTableTh>
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {users.map((u) => (
                <AppTableTr key={u.userId}>
                  <AppTableTd>
                    <p className="font-semibold text-slate-800">{u.displayName || u.username}</p>
                    <p className="text-ui-xs text-slate-500 font-mono">@{u.username}</p>
                  </AppTableTd>
                  <AppTableTd>{u.roleLabel || u.roleKey}</AppTableTd>
                  <AppTableTd>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-ui-xs font-bold uppercase ${RISK_CLS[u.riskLevel] || RISK_CLS.none}`}
                    >
                      {(u.riskLevel === 'critical' || u.riskLevel === 'high') && (
                        <AlertTriangle size={11} aria-hidden />
                      )}
                      {u.riskLevel || 'none'}
                    </span>
                  </AppTableTd>
                  <AppTableTd className="text-xs">{(u.modulesAffected || []).join(', ') || '—'}</AppTableTd>
                  <AppTableTd className="text-ui-xs font-mono text-slate-600 max-w-xs break-all">
                    {(u.extraPermissions || []).join(', ')}
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}
    </div>
  );
}
