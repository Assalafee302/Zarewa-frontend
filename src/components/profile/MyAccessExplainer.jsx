import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';
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

function AccessLink({ to, children, highlight = false }) {
  return (
    <Link
      to={to}
      className={`group flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold no-underline transition active:scale-[0.99] ${
        highlight
          ? 'border-teal-200 bg-teal-50/60 text-zarewa-teal hover:bg-teal-50'
          : 'border-slate-100 bg-slate-50/80 text-slate-800 hover:border-slate-200 hover:bg-white'
      }`}
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-zarewa-teal" aria-hidden />
    </Link>
  );
}

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
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-zarewa-teal">
            <LayoutGrid size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">What you can access</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Role: <strong className="font-semibold text-slate-800">{user?.roleLabel || user?.roleKey}</strong>.
              HR and administrators control which workspaces you can open.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {modules.length ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {modules.map((m) => (
              <li key={m.key}>
                <AccessLink to={m.path}>{m.label}</AccessLink>
              </li>
            ))}
            <li>
              <AccessLink to="/me" highlight>
                Account (always)
              </AccessLink>
            </li>
            <li>
              <AccessLink to="/my-profile">My HR</AccessLink>
            </li>
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-slate-600">
            You have Account, My HR, and any modules granted by your administrator.
          </p>
        )}

        <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
            Technical permissions ({permissions.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
            {permissions.slice(0, 24).map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-ui-xs font-mono text-slate-600"
              >
                {p}
              </span>
            ))}
            {permissions.length > 24 ? (
              <span className="text-xs text-slate-400">+{permissions.length - 24} more</span>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}
