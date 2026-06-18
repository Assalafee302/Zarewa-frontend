import React, { useMemo, useState } from 'react';
import { HrStaffFormFields } from './HrStaffFormFields';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formToRegisterBody, registerHrStaff } from '../../lib/hrStaff';
import { payrollGroupMayHaveLogin } from '../../shared/hrStaffCohorts';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * @param {{ defaultBranchId?: string; onSuccess: (userId: string) => void; onCancel?: () => void }} props
 */
export function HrStaffRegisterForm({ defaultBranchId, onSuccess, onCancel }) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const branch =
    defaultBranchId ||
    String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || '').trim();

  const [form, setForm] = useState(() => emptyStaffForm(branch));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!payrollGroupMayHaveLogin(form.payrollGroup)) {
      setError(
        'Executive family and household staff do not receive ERP logins. Register them in Chairman Accounts → Executive benefits.'
      );
      return;
    }
    setBusy(true);
    const { ok, data } = await registerHrStaff(formToRegisterBody(form));
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Registration failed.');
      return;
    }
    onSuccess(data.userId);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <HrStaffFormFields form={form} setForm={setForm} branches={branches} mode="register" showCompensation canViewFullBank />
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
          {busy ? 'Registering…' : 'Register staff'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
