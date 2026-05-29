import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { HrStaffFormFields } from '../../components/hr/HrStaffFormFields';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canManageHrStaff } from '../../lib/hrAccess';
import { formToRegisterBody, registerHrStaff } from '../../lib/hrStaff';
import { emptyStaffForm } from '../../lib/hrStaffConstants';

export default function HrStaffRegister() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canManage = canManageHrStaff(perms);

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const defaultBranch =
    String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || '').trim();

  const [form, setForm] = useState(() => emptyStaffForm(defaultBranch));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!canManage) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        You need HR staff management permission to register employees.
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { ok, data } = await registerHrStaff(formToRegisterBody(form));
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Registration failed.');
      return;
    }
    navigate(`/hr/staff/${encodeURIComponent(data.userId)}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/hr/staff"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden /> Staff directory
        </Link>
        <h2 className="mt-2 text-xl font-black text-slate-900">Register new staff</h2>
        <p className="text-sm text-slate-600">
          Creates a login account and HR employee file. Assign branch, job, and starting compensation.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
        <HrStaffFormFields form={form} setForm={setForm} branches={branches} mode="register" showCompensation />
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {busy ? 'Registering…' : 'Register staff'}
          </button>
          <Link
            to="/hr/staff"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
