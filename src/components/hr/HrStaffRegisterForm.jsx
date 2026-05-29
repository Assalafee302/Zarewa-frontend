import React, { useEffect, useMemo, useState } from 'react';
import { HrStaffFormFields } from './HrStaffFormFields';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formToRegisterBody, registerHrStaff } from '../../lib/hrStaff';
import { emptyStaffForm } from '../../lib/hrStaffConstants';
import { fetchApplicantPrefill } from '../../lib/hrRecruiting';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * @param {{ defaultBranchId?: string; applicantId?: string; onSuccess: (userId: string) => void; onCancel?: () => void }} props
 */
export function HrStaffRegisterForm({ defaultBranchId, applicantId, onSuccess, onCancel }) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const branch =
    defaultBranchId ||
    String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || '').trim();

  const [form, setForm] = useState(() => ({ ...emptyStaffForm(branch), applicantId: applicantId || '' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicantId) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchApplicantPrefill(applicantId);
      if (cancelled || !ok || !data?.ok || !data.prefill) return;
      const p = data.prefill;
      setForm((f) => ({
        ...f,
        applicantId,
        displayName: p.displayName || f.displayName,
        username: p.username || f.username,
        branchId: p.branchId || f.branchId,
        jobTitle: p.jobTitle || f.jobTitle,
        department: p.department || f.department,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [applicantId]);

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
    onSuccess(data.userId);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <HrStaffFormFields form={form} setForm={setForm} branches={branches} mode="register" showCompensation />
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
