import { HrButton } from '../../components/hr/hrPageUi';
import React, { useMemo, useState } from 'react';
import { HrStaffFormFields } from './HrStaffFormFields';
import { HrUnlinkedUserPicker } from './HrUnlinkedUserPicker';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formToRegisterBody, registerHrStaff } from '../../lib/hrStaff';
import { emptyStaffForm } from '../../lib/hrStaffConstants';
import {
  EMPLOYEE_DIRECTORY_GROUPS,
  HR_PAYROLL_GROUPS as COHORT_KEYS,
  isCompanyHrPayrollGroup,
  payrollGroupMayHaveLogin,
} from '../../shared/hrStaffCohorts';

function splitDisplayName(displayName) {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', surname: '' };
  if (parts.length === 1) return { firstName: parts[0], surname: '' };
  return { firstName: parts[0], surname: parts.slice(1).join(' ') };
}

/**
 * @param {{ defaultBranchId?: string; onSuccess: (userId: string) => void; onCancel?: () => void }} props
 */
export function HrStaffRegisterForm({ defaultBranchId, defaultPayrollGroup, onSuccess, onCancel }) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const branch =
    defaultBranchId ||
    String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || '').trim();
  const payrollGroup =
    String(defaultPayrollGroup || '').trim() || COHORT_KEYS.BRANCH_OPS;
  const allowedPayrollGroups =
    payrollGroup === COHORT_KEYS.MINING ? [COHORT_KEYS.MINING] : [...EMPLOYEE_DIRECTORY_GROUPS];

  const [mode, setMode] = useState('new');
  const [form, setForm] = useState(() => ({ ...emptyStaffForm(branch), payrollGroup }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setModeAndResetLogin = (nextMode) => {
    setMode(nextMode);
    setError('');
    setForm((f) => ({
      ...emptyStaffForm(branch),
      payrollGroup: f.payrollGroup || payrollGroup,
      branchId: f.branchId || branch,
      existingUserId: '',
      username: '',
      password: '',
      displayName: nextMode === 'existing' ? '' : f.displayName,
    }));
  };

  const selectExistingUser = (user) => {
    if (!user) {
      setForm((f) => ({ ...f, existingUserId: '', username: '', displayName: '', roleKey: 'sales_staff' }));
      return;
    }
    const names = splitDisplayName(user.displayName);
    setForm((f) => ({
      ...f,
      existingUserId: user.userId,
      username: user.username || '',
      displayName: user.displayName || '',
      roleKey: user.roleKey || f.roleKey || 'sales_staff',
      branchId: user.branchId || f.branchId || branch,
      firstName: f.firstName || names.firstName,
      surname: f.surname || names.surname,
      personalEmail: f.personalEmail || user.email || '',
      password: '',
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'existing' && !String(form.existingUserId || '').trim()) {
      setError('Select the existing login to attach this HR profile to.');
      return;
    }
    if (!payrollGroupMayHaveLogin(form.payrollGroup)) {
      setError(
        'Executive family and household staff do not receive ERP logins. Register them in Chairman Office → Scholarships or Household.'
      );
      return;
    }
    if (payrollGroup === COHORT_KEYS.MINING && form.payrollGroup !== COHORT_KEYS.MINING) {
      setError('Mining staff must be registered as Mining division on Chairman Office.');
      return;
    }
    if (payrollGroup !== COHORT_KEYS.MINING && !isCompanyHrPayrollGroup(form.payrollGroup)) {
      setError('Household, mining, and scholarships are registered on Chairman Office, not company HR.');
      return;
    }
    setBusy(true);
    const { ok, data } = await registerHrStaff(formToRegisterBody(form));
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Registration failed.');
      if (data?.code === 'DUPLICATE_DISPLAY_NAME' && data?.existingUserId) {
        setMode('existing');
        setForm((f) => ({
          ...f,
          existingUserId: data.existingUserId,
          password: '',
        }));
      }
      return;
    }
    onSuccess(data.userId);
  };

  const existingLogin = mode === 'existing';

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="inline-flex rounded-md border border-slate-200 p-0.5">
        {[
          { id: 'new', label: 'New login' },
          { id: 'existing', label: 'Existing user' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setModeAndResetLogin(opt.id)}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium ${
              mode === opt.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {existingLogin ? (
        <HrUnlinkedUserPicker value={form.existingUserId} onSelect={selectExistingUser} />
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <HrStaffFormFields
        form={form}
        setForm={setForm}
        branches={branches}
        mode="register"
        existingLogin={existingLogin}
        showCompensation
        canViewFullBank
        allowedPayrollGroups={allowedPayrollGroups}
      />
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <HrButton type="submit" disabled={busy || (existingLogin && !form.existingUserId)}>
          {busy ? 'Saving…' : existingLogin ? 'Create HR profile' : 'Register staff'}
        </HrButton>
        {onCancel ? (
          <HrButton type="button" onClick={onCancel} variant="secondary">
            Cancel
          </HrButton>
        ) : null}
      </div>
    </form>
  );
}
