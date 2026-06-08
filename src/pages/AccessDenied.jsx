import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { MODULE_ACCESS_POLICY } from '../lib/moduleAccess';

const MODULE_LABELS = {
  sales: 'Sales',
  procurement: 'Procurement',
  operations: 'Operations & Production',
  finance: 'Finance & Treasury',
  cashier_desk: 'Cashier Desk',
  accounting_desk: 'Accounting Desk',
  reports: 'Reports',
  settings: 'Settings',
  office: 'Office',
  hr: 'HR',
  team_hr: 'Team HR',
  my_profile_hr: 'My Profile',
  executive_hr: 'Executive HR',
  edit_approvals: 'Edit Approvals',
};

export default function AccessDenied() {
  const location = useLocation();
  const moduleKey = location.state?.moduleKey || location.state?.moduleDenied || '';
  const label = MODULE_LABELS[moduleKey] || moduleKey || 'this area';
  const perms = MODULE_ACCESS_POLICY[moduleKey];
  const permHint = Array.isArray(perms) && perms.length ? perms.slice(0, 3).join(', ') : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
        <ShieldAlert size={32} />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        You are signed in, but your account does not have permission to open <strong>{label}</strong>.
        {permHint ? (
          <>
            {' '}
            Typical access requires permissions such as <code className="text-xs">{permHint}</code>.
          </>
        ) : null}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        If you need access, contact your administrator or branch manager.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#134e4a] px-5 py-3 text-sm font-bold text-white shadow-lg hover:brightness-105"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>
    </div>
  );
}
