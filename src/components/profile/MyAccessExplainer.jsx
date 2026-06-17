import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canAccessModuleWithPermissions } from '../../lib/moduleAccess';

const MODULE_HINTS = [
  { key: 'sales', label: 'Sales', path: '/sales', perm: 'sales.view' },
  { key: 'operations', label: 'Store & production', path: '/operations', perm: 'operations.view' },
  { key: 'procurement', label: 'Procurement', path: '/procurement', perm: 'procurement.view' },
  { key: 'accounts', label: 'Finance & accounts', path: '/accounts', perm: 'accounts.view' },
  { key: 'hr', label: 'Human resources', path: '/hr', perm: 'hr.directory.view' },
  { key: 'team_hr', label: 'Team HR', path: '/team-hr', perm: 'hr.team.view' },
  { key: 'executive_hr', label: 'Executive HR', path: '/executive-hr', perm: 'hr.executive.view' },
  { key: 'manager', label: 'Management', path: '/manager', perm: 'sales.manage' },
  { key: 'settings', label: 'Settings', path: '/settings', perm: 'settings.view' },
];
const EMPTY_PERMISSIONS = [];

export function MyAccessExplainer() {
  const ws = useWorkspace();
  const permissions = useMemo(() => ws?.permissions ?? EMPTY_PERMISSIONS, [ws?.permissions]);
  const user = ws?.session?.user;
  const wsCanAccessModule = ws?.canAccessModule;

  const modules = useMemo(() => {
    return MODULE_HINTS.filter((m) => {
      if (m.perm && permissions.includes(m.perm)) return true;
      return typeof wsCanAccessModule === 'function'
        ? wsCanAccessModule(m.key)
        : canAccessModuleWithPermissions(permissions, m.key);
    });
  }, [permissions, wsCanAccessModule]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">What you can access</h3>
      <p className="mt-1 text-xs text-slate-600">
        Your role is <strong>{user?.roleLabel || user?.roleKey}</strong>. HR and administrators assign which parts of
        Zarewa you can use.
      </p>
      {modules.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.key}>
              <Link to={m.path} className="flex min-h-11 items-center rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-[#134e4a] no-underline active:bg-teal-50">
                {m.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/me" className="flex min-h-11 items-center rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm font-semibold text-[#134e4a] no-underline active:bg-teal-100">
              Account (always)
            </Link>
          </li>
          <li>
            <Link to="/my-profile" className="flex min-h-11 items-center rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-[#134e4a] no-underline active:bg-teal-50">
              HR services
            </Link>
          </li>
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">You have Account, HR services, and any modules granted by your administrator.</p>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Technical permissions ({permissions.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {permissions.slice(0, 24).map((p) => (
            <span key={p} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-600">
              {p}
            </span>
          ))}
          {permissions.length > 24 ? <span className="text-xs text-slate-400">+{permissions.length - 24} more</span> : null}
        </div>
      </details>
    </section>
  );
}
